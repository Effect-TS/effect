import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import type * as Redacted from "effect/Redacted"
import * as Schedule from "effect/Schedule"
import * as Argument from "effect/unstable/cli/Argument"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import * as Prompt from "effect/unstable/cli/Prompt"
import { SpikeError } from "./Errors.ts"
import { Findings } from "./Findings.ts"
import { runPnpm, stageIdsFromJson } from "./Pnpm.ts"
import * as Registry from "./Registry.ts"

export const FIXTURE_NAME = "@effect/release-spike-fixture"

// ---------------------------------------------------------------------------
// Credentials: read from the environment only, registered for redaction, never
// echoed. `NPM_TOKEN` is optional so OIDC runs (no token) work unchanged.
// ---------------------------------------------------------------------------

const resolveToken = Effect.fn("resolveToken")(function*(anonymous: boolean) {
  if (anonymous) return Option.none<Redacted.Redacted<string>>()
  const findings = yield* Findings
  const token = yield* Config.option(Config.Redacted("NPM_TOKEN"))
  if (Option.isSome(token)) yield* findings.addSecret(token.value)
  return token
})

const otpFlag = Flag.Redacted("otp").pipe(
  Flag.withDescription("One-time password from the maintainer's authenticator (prompted if omitted; never stored)"),
  Flag.withFallbackPrompt(Prompt.Password({ message: "npm one-time password" }))
)

const anonymousFlag = Flag.Boolean("anonymous").pipe(
  Flag.withDescription("Send no Authorization header, to record the unauthenticated response"),
  Flag.withDefault(false)
)

const summarizeResponse = (response: Registry.RegistryResponse) => ({
  url: response.url,
  status: response.status,
  durationMs: response.durationMs,
  headers: response.headers,
  ...(response.status === 200 ? {} : { body: response.body ?? response.text.slice(0, 2000) })
})

const rawResponse = (response: Registry.RegistryResponse) => ({
  ...summarizeResponse(response),
  body: response.body ?? response.text.slice(0, 2000)
})

const unique = (values: ReadonlyArray<string>) => Array.from(new Set(values)).sort()

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

const packageFlag = Flag.String("package").pipe(
  Flag.withDescription("Only list staged versions of this package"),
  Flag.optional
)

const list = Command.make(
  "list",
  { pkg: packageFlag, anonymous: anonymousFlag },
  ({ anonymous, pkg }) =>
    Effect.gen(function*() {
      const findings = yield* Findings
      const token = yield* resolveToken(anonymous)
      const { items, responses } = yield* Registry.listStaged(
        token,
        pkg,
        (response) => findings.record("stage-list-response", rawResponse(response))
      )
      const rows = items.map(({ item, raw }) => ({ ...item, extraFields: Registry.extraFields(raw) }))
      const statuses = unique(rows.map((row) => row.status ?? "<missing>"))
      yield* findings.record("stage-list", {
        authenticated: Option.isSome(token),
        package: Option.getOrUndefined(pkg),
        responses: responses.map(summarizeResponse),
        statuses,
        items: rows
      })
      const failed = responses.find((response) => response.status < 200 || response.status >= 300)
      if (failed !== undefined) {
        return yield* new SpikeError({ message: `GET /-/stage returned HTTP ${failed.status}` })
      }
      yield* Console.log(`GET /-/stage -> ${responses.map((response) => response.status).join(", ")}`)
      if (rows.length === 0) {
        yield* Console.log("No staged items visible to this credential.")
      } else {
        yield* Console.table(rows, ["id", "packageName", "version", "tag", "status", "createdAt"])
        yield* Console.log(`status values seen: ${statuses.join(", ")}`)
        yield* Console.log(`extra fields seen: ${unique(rows.flatMap((row) => row.extraFields)).join(", ") || "none"}`)
      }
    })
).pipe(Command.withDescription("List staged items via GET /-/stage and record the status vocabulary"))

// ---------------------------------------------------------------------------
// view
// ---------------------------------------------------------------------------

const stageIdArgument = Argument.String("stage-id").pipe(
  Argument.withDescription("Stage id (UUID) returned by stage publish")
)

const view = Command.make(
  "view",
  { stageId: stageIdArgument, anonymous: anonymousFlag },
  ({ anonymous, stageId }) =>
    Effect.gen(function*() {
      const findings = yield* Findings
      const token = yield* resolveToken(anonymous)
      const { item, response } = yield* Registry.viewStaged(
        token,
        stageId,
        (response) => findings.record("stage-view-response", rawResponse(response))
      )
      yield* findings.record("stage-view", {
        authenticated: Option.isSome(token),
        stageId,
        response: summarizeResponse(response),
        item: Option.getOrUndefined(item),
        extraFields: Registry.extraFields(response.body)
      })
      if (response.status < 200 || response.status >= 300) {
        return yield* new SpikeError({ message: `GET /-/stage/${stageId} returned HTTP ${response.status}` })
      }
      yield* Console.log(`GET /-/stage/${stageId} -> ${response.status}`)
      yield* Console.log(JSON.stringify(findings.redactUnknown(response.body ?? response.text), null, 2))
    })
).pipe(Command.withDescription("Fetch one staged item via GET /-/stage/<id>"))

// ---------------------------------------------------------------------------
// watch
// ---------------------------------------------------------------------------

const intervalFlag = Flag.Int("interval").pipe(
  Flag.withDescription("Seconds between polls"),
  Flag.withDefault(30)
)
const timeoutFlag = Flag.Int("timeout").pipe(
  Flag.withDescription("Give up after this many minutes"),
  Flag.withDefault(30)
)
const whileFlag = Flag.String("while").pipe(
  Flag.withDescription("Keep polling while the status equals this value (defaults to the first observed status)"),
  Flag.optional
)

const watch = Command.make("watch", {
  stageId: stageIdArgument,
  interval: intervalFlag,
  timeout: timeoutFlag,
  whileStatus: whileFlag
}, ({ interval, stageId, timeout, whileStatus }) =>
  Effect.gen(function*() {
    const findings = yield* Findings
    const token = yield* resolveToken(false)
    const startedAt = Date.now()
    const transitions: Array<{ readonly afterMs: number; readonly status: string; readonly httpStatus: number }> = []
    let initialStatus = Option.getOrUndefined(whileStatus)
    let settlingStatus: string | undefined
    let settlingObservations = 0

    const poll = Effect.gen(function*() {
      const { item, response } = yield* Registry.viewStaged(token, stageId)
      const status = response.status === 200
        ? Option.match(item, { onNone: () => "<missing>", onSome: (found) => found.status ?? "<missing>" })
        : `<http ${response.status}>`
      const previous = transitions.at(-1)
      const observation = { afterMs: Date.now() - startedAt, status, httpStatus: response.status }
      yield* findings.record("stage-watch-observation", { stageId, ...observation })
      if (previous === undefined || previous.status !== status) {
        transitions.push(observation)
        yield* Console.log(
          `+${Math.round((Date.now() - startedAt) / 1000)}s status=${status} (http ${response.status})`
        )
      }
      if (initialStatus === undefined) initialStatus = status
      if (status === initialStatus) {
        settlingStatus = undefined
        settlingObservations = 0
      } else if (status === settlingStatus) {
        settlingObservations++
      } else {
        settlingStatus = status
        settlingObservations = 1
      }
      return { settled: settlingObservations >= 3, status }
    })

    const outcome = yield* poll.pipe(
      Effect.repeat({
        schedule: Schedule.spaced(Duration.seconds(interval)),
        until: ({ settled }) => settled
      }),
      Effect.map(({ status }) => ({ finalStatus: status, timedOut: false })),
      Effect.timeoutOption(Duration.minutes(timeout)),
      Effect.map(Option.getOrElse(() => ({ finalStatus: transitions.at(-1)?.status ?? "<none>", timedOut: true })))
    )

    yield* findings.record("stage-watch", {
      stageId,
      intervalSeconds: interval,
      ...outcome,
      totalMs: Date.now() - startedAt,
      transitions
    })
    yield* Console.log(
      outcome.timedOut
        ? `Timed out after ${timeout} minutes; last status ${outcome.finalStatus}`
        : `Left "${initialStatus}" and observed "${outcome.finalStatus}" three times; ` +
          `finished after ${Math.round((Date.now() - startedAt) / 1000)}s`
    )
  })).pipe(Command.withDescription("Poll a staged item and record every status transition with timing"))

// ---------------------------------------------------------------------------
// stage
// ---------------------------------------------------------------------------

const dirFlag = Flag.String("dir").pipe(
  Flag.withMetavar("DIRECTORY"),
  Flag.withDescription("Package directory to stage (defaults to the disposable fixture)"),
  Flag.withDefault("fixture")
)
const setVersionFlag = Flag.String("set-version").pipe(
  Flag.withDescription("Rewrite the fixture's package.json version before staging (e.g. 0.0.0-spike.3)"),
  Flag.optional
)
const tagFlag = Flag.String("tag").pipe(
  Flag.withDescription("dist-tag to stage under; never use latest for the fixture"),
  Flag.withDefault("spike")
)
const dryRunFlag = Flag.Boolean("dry-run").pipe(
  Flag.withDescription("Pack and print, upload nothing"),
  Flag.withDefault(false)
)
const provenanceFlag = Flag.Boolean("provenance").pipe(
  Flag.withDescription("Ask pnpm to generate a provenance statement (only works under trusted publishing in CI)"),
  Flag.withDefault(false)
)
const repeatFlag = Flag.Int("repeat").pipe(
  Flag.withDescription("Stage the same version this many times, to record how the registry rejects duplicates"),
  Flag.withDefault(1)
)

const stage = Command.make("stage", {
  dir: dirFlag,
  setVersion: setVersionFlag,
  tag: tagFlag,
  dryRun: dryRunFlag,
  provenance: provenanceFlag,
  repeat: repeatFlag
}, ({ dir, dryRun, provenance, repeat, setVersion, tag }) =>
  Effect.gen(function*() {
    const findings = yield* Findings
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const cwd = path.resolve(dir)
    const manifestPath = path.join(cwd, "package.json")
    const originalManifest = yield* fs.readFileString(manifestPath).pipe(
      Effect.mapError((cause) => new SpikeError({ message: `Could not read ${manifestPath}`, cause }))
    )
    const manifest = yield* Effect.try({
      try: () => JSON.parse(originalManifest) as { name: string; version: string },
      catch: (cause) => new SpikeError({ message: `Could not parse ${manifestPath}`, cause })
    })
    if (manifest.name !== FIXTURE_NAME) {
      return yield* new SpikeError({
        message: `Refusing to stage ${manifest.name}: this harness only stages ${FIXTURE_NAME}`
      })
    }
    const runStage = Effect.gen(function*() {
      const token = yield* resolveToken(false)
      const args = [
        "stage",
        "publish",
        "--tag",
        tag,
        "--no-git-checks",
        "--json",
        ...(dryRun ? ["--dry-run"] : []),
        ...(provenance ? ["--provenance"] : [])
      ]
      for (let attempt = 1; attempt <= repeat; attempt++) {
        const run = yield* runPnpm(args, { cwd, token })
        const stageIds = stageIdsFromJson(run.stdout)
        yield* findings.record("stage-publish", {
          attempt,
          package: manifest.name,
          version: manifest.version,
          tag,
          dryRun,
          provenance,
          credential: Option.isSome(token) ? "token" : "none (OIDC or pnpm config)",
          exitCode: run.exitCode,
          durationMs: run.durationMs,
          stageIds,
          stdout: run.stdout,
          stderr: run.stderr
        })
        yield* Console.log(
          `attempt ${attempt}: pnpm exited ${run.exitCode} in ${run.durationMs}ms` +
            (stageIds.length > 0
              ? `; stage id ${stageIds.map((entry) => entry.stageId).join(", ")}`
              : dryRun
              ? "; dry run, no stage id expected"
              : "; no stage id found in pnpm output")
        )
        if (run.exitCode !== 0) yield* Console.log(run.stderr.trim())
      }
    })
    if (Option.isNone(setVersion)) {
      yield* runStage
    } else {
      manifest.version = setVersion.value
      yield* Effect.scoped(
        Effect.acquireRelease(
          fs.writeFileString(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`).pipe(
            Effect.mapError((cause) => new SpikeError({ message: `Could not write ${manifestPath}`, cause }))
          ),
          () => fs.writeFileString(manifestPath, originalManifest).pipe(Effect.orDie)
        ).pipe(Effect.andThen(runStage))
      )
    }
  })).pipe(Command.withDescription("Run `pnpm stage publish` for the fixture with a non-TTY stdin, like CI"))

// ---------------------------------------------------------------------------
// approve / reject
// ---------------------------------------------------------------------------

const stageIdsArgument = Argument.String("stage-id").pipe(
  Argument.withDescription("One or more stage ids, approved in the order given"),
  Argument.variadic({ min: 1 })
)

const runWithOtp = (verb: "approve" | "reject") =>
  Effect.fn(`stage-${verb}`)(function*(stageIds: ReadonlyArray<string>, otp: Redacted.Redacted<string>) {
    const findings = yield* Findings
    const path = yield* Path.Path
    yield* findings.addSecret(otp)
    const token = yield* resolveToken(false)
    const results: Array<Record<string, unknown>> = []
    for (const stageId of stageIds) {
      const staged = yield* Registry.viewStaged(
        token,
        stageId,
        (response) => findings.record(`stage-${verb}-preflight-response`, rawResponse(response))
      )
      if (staged.response.status !== 200 || Option.isNone(staged.item)) {
        return yield* new SpikeError({
          message: `Refusing to ${verb} ${stageId}: could not verify the staged package`
        })
      }
      if (staged.item.value.packageName !== FIXTURE_NAME) {
        return yield* new SpikeError({
          message: `Refusing to ${verb} ${stageId}: belongs to ${staged.item.value.packageName}, not ${FIXTURE_NAME}`
        })
      }
    }
    const startedAt = Date.now()
    for (const [index, stageId] of stageIds.entries()) {
      const run = yield* runPnpm(["stage", verb, stageId], { cwd: path.resolve("."), token, otp: Option.some(otp) })
      const otpRejected = /otp|one-time|EOTP|401/i.test(run.stderr)
      results.push({
        index,
        stageId,
        exitCode: run.exitCode,
        durationMs: run.durationMs,
        sinceFirstMs: Date.now() - startedAt,
        otpRejected,
        stdout: run.stdout.trim(),
        stderr: run.stderr.trim()
      })
      yield* Console.log(
        `${verb} ${stageId}: exit ${run.exitCode} after ${run.durationMs}ms (${Date.now() - startedAt}ms since first)`
      )
      if (run.exitCode !== 0) yield* Console.log(run.stderr.trim())
    }
    yield* findings.record(`stage-${verb}`, {
      stageIds,
      sameOtpForAll: true,
      credential: Option.isSome(token) ? "token" : "pnpm config",
      totalMs: Date.now() - startedAt,
      results
    })
  })

const approve = Command.make(
  "approve",
  { stageIds: stageIdsArgument, otp: otpFlag },
  ({ otp, stageIds }) => runWithOtp("approve")(stageIds, otp)
).pipe(
  Command.withDescription(
    "Approve staged ids one by one with a single OTP and a non-TTY stdin, recording where it stops working"
  )
)

const reject = Command.make(
  "reject",
  { stageIds: stageIdsArgument, otp: otpFlag },
  ({ otp, stageIds }) => runWithOtp("reject")(stageIds, otp)
).pipe(
  Command.withDescription("Reject (delete) staged ids; used for cleanup and to observe the OTP requirement")
)

// ---------------------------------------------------------------------------
// attestations
// ---------------------------------------------------------------------------

const packageArgument = Argument.String("package").pipe(Argument.withDescription("Package name"))
const versionArgument = Argument.String("version").pipe(Argument.withDescription("Published version to inspect"))

const attestations = Command.make(
  "attestations",
  { pkg: packageArgument, version: versionArgument },
  ({ pkg, version }) =>
    Effect.gen(function*() {
      const findings = yield* Findings
      const token = yield* resolveToken(false)
      const packument = yield* Registry.registryGet(Registry.packumentUrl(pkg), { token })
      const body = packument.body as {
        readonly versions?: Record<string, { readonly dist?: Record<string, unknown>; readonly _npmUser?: unknown }>
        readonly time?: Record<string, string>
        readonly "dist-tags"?: Record<string, string>
      } | undefined
      const entry = body?.versions?.[version]
      const attestationsResponse = yield* Registry.registryGet(Registry.attestationsUrl(pkg, version), { token })
      const attestationBody = attestationsResponse.body as {
        readonly attestations?: ReadonlyArray<{ readonly predicateType?: string }>
      } | undefined
      const summary = {
        package: pkg,
        version,
        packumentStatus: packument.status,
        versionPublished: entry !== undefined,
        publishedAt: body?.time?.[version],
        distTags: body?.["dist-tags"],
        distAttestations: entry?.dist?.["attestations"],
        npmUser: entry?._npmUser,
        attestationsEndpointStatus: attestationsResponse.status,
        predicateTypes: attestationBody?.attestations?.map((attestation) => attestation.predicateType ?? "<unknown>") ??
          []
      }
      yield* findings.record("attestations", summary)
      yield* Console.log(JSON.stringify(findings.redactUnknown(summary), null, 2))
    })
).pipe(Command.withDescription("Check whether a published version carries provenance and an approver record"))

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const report = Command.make("report", {}, () =>
  Effect.gen(function*() {
    const findings = yield* Findings
    const entries = yield* findings.readAll
    if (entries.length === 0) {
      return yield* Console.log(`No findings recorded yet in ${findings.file}`)
    }
    const counts = new Map<string, number>()
    for (const entry of entries) {
      const kind = String(entry["kind"])
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    yield* Console.log(`${entries.length} findings in ${findings.file}`)
    yield* Console.table(Array.from(counts, ([kind, count]) => ({ kind, count })))
    for (const entry of entries) {
      const data = entry["data"] as Record<string, unknown> | undefined
      const brief = data === undefined ? "" : Object.entries(data)
        .filter(([key, value]) => (typeof value !== "object" || value === null) && key !== "stdout" && key !== "stderr")
        .map(([key, value]) => `${key}=${String(value).slice(0, 80)}`)
        .join(" ")
      yield* Console.log(`${String(entry["at"])} ${String(entry["kind"])} ${brief}`)
    }
  })).pipe(Command.withDescription("Summarise everything recorded so far"))

// ---------------------------------------------------------------------------

export const cli = Command.make("release-spike").pipe(
  Command.withDescription(
    "Manually invoked probes for npm staged publishing. Credentials come from NPM_TOKEN and the OTP prompt only; " +
      "every recorded string is scrubbed of both before it is printed or written."
  ),
  Command.withSubcommands([list, view, watch, stage, approve, reject, attestations, report])
)
