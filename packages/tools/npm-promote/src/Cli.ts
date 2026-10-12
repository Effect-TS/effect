import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Clock from "effect/Clock"
import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Semver from "semver"
import { diagnosePending, promote, type PromoteResult, type ReleasePackage } from "./NpmPromote.ts"
import { NpmPromoteError } from "./NpmPromoteError.ts"
import * as TrackingIssue from "./TrackingIssue.ts"
import * as Workspace from "./Workspace.ts"

const dryRun = Flag.Boolean("dry-run").pipe(
  Flag.withDescription("Print what would change without moving dist-tags or touching GitHub issues"),
  Flag.withDefault(false)
)

const overdueAfterHours = Flag.Int("overdue-after-hours").pipe(
  Flag.withDescription("Open a tracking issue when a version bump is still unpromoted after this many hours"),
  Flag.withDefault(12)
)

const githubRepository = Config.all({
  repository: Config.String("GITHUB_REPOSITORY"),
  token: Config.Redacted("GITHUB_TOKEN")
}).pipe(Config.option)

const githubOutput = Config.String("GITHUB_OUTPUT").pipe(Config.option)

const format = (pkg: ReleasePackage) => `${pkg.name}@${pkg.version}`

const writeOutputs = Effect.fnUntraced(function*(outputs: Record<string, string>) {
  const path = yield* githubOutput
  if (Option.isNone(path)) {
    return
  }
  const fs = yield* FileSystem.FileSystem
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join("")
  yield* fs.writeFileString(path.value, lines, { flag: "a" }).pipe(
    Effect.mapError((cause) => new NpmPromoteError({ message: "Could not write GitHub step outputs", cause }))
  )
})

const onPromoted = Effect.fnUntraced(function*(
  result: Extract<PromoteResult, { _tag: "Promoted" }>,
  options: { readonly dryRun: boolean; readonly effectDirectory: string }
) {
  if (result.promoted.length === 0) {
    yield* Console.log("Every package already has latest at or above its target version.")
  }
  for (const pkg of result.promoted) {
    yield* Console.log(`${options.dryRun ? "Would promote" : "Promoted"} ${format(pkg)} to latest`)
  }
  if (options.dryRun) {
    yield* Console.log("Would close the tracking issue, if one is open.")
    return
  }

  // Deploy the website for the commit that bumped the versions, as the release workflow did.
  if (Option.isSome(yield* githubOutput)) {
    const bump = yield* Workspace.versionBump(options.effectDirectory)
    yield* writeOutputs({
      promoted: result.promoted.length > 0 ? "true" : "false",
      revision: Option.match(bump, { onNone: () => "", onSome: (bump) => bump.sha })
    })
  }

  const github = yield* githubRepository
  if (Option.isSome(github)) {
    // A failure here must not fail the step, or the website deploy that follows a promotion is skipped.
    yield* TrackingIssue.close(github.value, "Promotion succeeded, so this is resolved.").pipe(
      Effect.flatMap(Option.match({
        onNone: () => Effect.void,
        onSome: (number) => Console.log(`Closed tracking issue #${number}`)
      })),
      Effect.catch((error) => Console.warn(`${error.message}: ${String(error.cause)}`))
    )
  }
})

const onNotVisible = Effect.fnUntraced(function*(
  result: Extract<PromoteResult, { _tag: "NotVisible" }>,
  options: {
    readonly dryRun: boolean
    readonly overdueAfterHours: number
    readonly effect: Workspace.WorkspacePackage
  }
) {
  yield* Console.log(
    `Waiting for ${result.pending.length} package(s) to show up in the npm registry:\n${
      result.pending.map((pkg) => `  ${format(pkg)}`).join("\n")
    }`
  )

  const bump = yield* Workspace.versionBump(options.effect.directory)
  if (Option.isNone(bump)) {
    return yield* new NpmPromoteError({ message: "Could not find the commit that bumped the effect version" })
  }
  const ageHours = ((yield* Clock.currentTimeMillis) - bump.value.committedAt.getTime()) / 3_600_000
  if (ageHours < options.overdueAfterHours) {
    yield* Console.log(`The version bump landed ${ageHours.toFixed(1)} hours ago, so promotion is not overdue yet.`)
    return
  }

  const content = TrackingIssue.render({
    version: options.effect.version,
    bump: bump.value,
    overdueAfterHours: options.overdueAfterHours,
    diagnoses: yield* diagnosePending(result.pending)
  })
  if (options.dryRun) {
    yield* Console.log(`Would open or update the tracking issue "${content.title}":\n\n${content.body}`)
    return
  }
  const github = yield* githubRepository
  if (Option.isNone(github)) {
    yield* Console.warn(
      "Promotion is overdue, but GITHUB_REPOSITORY or GITHUB_TOKEN is not set, so no issue was opened."
    )
    return
  }
  const issue = yield* TrackingIssue.upsert(github.value, content)
  yield* Console.log(`Tracking issue #${issue.number}: ${issue.action}`)
})

const run = Effect.fnUntraced(function*(options: {
  readonly dryRun: boolean
  readonly overdueAfterHours: number
}) {
  const workspace = yield* Workspace.releasePackages(process.cwd())
  const effect = workspace.find((pkg) => pkg.name === "effect")
  if (effect === undefined) {
    return yield* new NpmPromoteError({ message: "The workspace has no public effect package" })
  }

  // Never point latest at a prerelease. Pre mode releases keep their own dist-tag.
  const prereleases = workspace.filter((pkg) => Semver.prerelease(pkg.version) !== null)
  if (prereleases.length > 0) {
    yield* Console.log(`Skipping promotion of prerelease versions: ${prereleases.map(format).join(", ")}`)
    return
  }

  const packages = workspace.map(({ name, version }): ReleasePackage => ({ name, version }))
  const result = yield* promote(packages, { dryRun: options.dryRun })
  if (result._tag === "Promoted") {
    yield* onPromoted(result, { dryRun: options.dryRun, effectDirectory: effect.directory })
  } else {
    yield* onNotVisible(result, { ...options, effect })
  }
})

export const cli = Command.make("npm-promote", { dryRun, overdueAfterHours }).pipe(
  Command.withDescription("Move the latest dist-tag to the staged release once every package is visible on npm"),
  Command.withHandler(run)
)
