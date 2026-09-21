import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Release } from "./Release.ts"

const tagFlag = Flag.String("tag").pipe(
  Flag.withDescription("dist-tag for staged versions, e.g. rc")
)

const dryRunFlag = Flag.Boolean("dry-run").pipe(
  Flag.withDescription("When the route is Stage, pack without uploading"),
  Flag.withDefault(false)
)

const plan = Command.make("plan", {}, () =>
  Effect.gen(function*() {
    const release = yield* Release
    const result = yield* release.plan
    yield* Console.log(JSON.stringify(result, null, 2))
  })).pipe(Command.withDescription("Print the release plan pnpm derives from the pending change intents"))

const route = Command.make("route", {}, () =>
  Effect.gen(function*() {
    const release = yield* Release
    const result = yield* release.route
    yield* Console.log(JSON.stringify(result, null, 2))
  })).pipe(Command.withDescription("Print what a push to main would do: Version, Stage or Idle"))

const run = Command.make("run", { tag: tagFlag, dryRun: dryRunFlag }, ({ dryRun, tag }) =>
  Effect.gen(function*() {
    const release = yield* Release
    const result = yield* release.run({ tag, dryRun })
    yield* Console.log(JSON.stringify(result, null, 2))
  })).pipe(
    Command.withDescription(
      "Create or update the version PR when intents are pending; otherwise stage every unpublished version"
    )
  )

export const cli = Command.make("release").pipe(
  Command.withDescription("Release automation for the Effect monorepo (version PRs and staged publishing)"),
  Command.withSubcommands([plan, route, run])
)
