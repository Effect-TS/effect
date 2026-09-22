import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
// The published effect package exports this public barrel, not its source modules.
// oxlint-disable-next-line effect/no-import-from-barrel-package
import { Command, Flag } from "effect/unstable/cli"
import { OTP, Publication } from "./Publication.ts"
import { Release } from "./Release.ts"
import { requireSecret } from "./Secrets.ts"

const printJson = (value: unknown) => Console.log(JSON.stringify(value, null, 2))

const tagFlag = Flag.String("tag").pipe(
  Flag.withDescription("dist-tag for staged versions, e.g. rc")
)

const dryRunFlag = Flag.Boolean("dry-run").pipe(
  Flag.withDescription("Preview the selected route without mutating git, GitHub or npm"),
  Flag.withDefault(false)
)

const expectFlag = Flag.Literals("expect", ["Version", "Stage"] as const).pipe(
  Flag.withDescription("Fail unless routing selects the expected mutating route"),
  Flag.optional
)

const plan = Command.make("plan", {}, () =>
  Effect.gen(function*() {
    const release = yield* Release
    const result = yield* release.plan
    yield* printJson(result)
  })).pipe(Command.withDescription("Print the release plan pnpm derives from the pending change intents"))

const route = Command.make("route", {}, () =>
  Effect.gen(function*() {
    const release = yield* Release
    const result = yield* release.route
    yield* printJson(result)
  })).pipe(Command.withDescription("Print what a push to main would do: Version, Stage or Idle"))

const run = Command.make(
  "run",
  { tag: tagFlag, dryRun: dryRunFlag, expect: expectFlag },
  ({ dryRun, expect, tag }) =>
    Effect.gen(function*() {
      const release = yield* Release
      const result = yield* release.run({
        tag,
        dryRun,
        expectedRoute: Option.getOrUndefined(expect)
      })
      yield* printJson(result)
    })
).pipe(
  Command.withDescription(
    "Create or update the version PR when intents are pending; otherwise stage every unpublished version"
  )
)

const readiness = Command.make(
  "readiness",
  { tag: tagFlag, dryRun: dryRunFlag },
  ({ dryRun, tag }) =>
    Effect.gen(function*() {
      const publication = yield* Publication
      const result = yield* publication.readiness({ tag, dryRun })
      yield* printJson(result)
    })
).pipe(
  Command.withDescription(
    "Open or refresh the publish PR once every staged version has passed validation; otherwise report why not"
  )
)

const expectIdentityFlag = Flag.String("expect-identity").pipe(
  Flag.withDescription("Identity of the merged release manifest, as printed in the publish PR")
)

/** The OTP comes from the environment so that it never appears on argv or in the shell history. */
const otp = requireSecret(OTP, `${OTP} is not set; approving staged versions needs a one-time password`)

const publish = Command.make(
  "publish",
  { expectIdentity: expectIdentityFlag, dryRun: dryRunFlag },
  ({ dryRun, expectIdentity }) =>
    Effect.gen(function*() {
      const publication = yield* Publication
      const result = yield* publication.publish({ expectedIdentity: expectIdentity, otp: yield* otp, dryRun })
      yield* printJson(result)
    })
).pipe(
  Command.withDescription(
    "Approve the staged versions pinned by the merged release manifest after rechecking the whole release"
  )
)

export const cli = Command.make("release").pipe(
  Command.withDescription("Release automation for the Effect monorepo (version PRs, staged publishing and approval)"),
  Command.withSubcommands([plan, route, run, readiness, publish])
)
