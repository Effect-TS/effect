import { cli } from "@effect/release"
import { Publication } from "@effect/release/Publication"
import type { StagedItem } from "@effect/release/Registry"
import { Release } from "@effect/release/Release"
import type { ReleasePlan } from "@effect/release/ReleasePlan"
import { assert, describe, it } from "@effect/vitest"
import * as CliOutput from "effect/cli/CliOutput"
import * as Command from "effect/cli/Command"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Stdio from "effect/Stdio"
import * as Terminal from "effect/Terminal"
import { TestConsole } from "effect/testing"
import {
  callNames,
  callsTo,
  emptyPlan,
  githubLayer,
  gitLayer,
  makeCalls,
  packages,
  pnpmLayer,
  rcPlan,
  registryLayer,
  stagedItem,
  workspaceLayer
} from "./utils.ts"

const cliEnvironment = Layer.mergeAll(
  FileSystem.layerNoop({}),
  Path.layer,
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("no child processes in these tests"))
  ),
  Stdio.layerTest({}),
  TestConsole.layer,
  CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
  ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} })),
  Layer.succeed(
    Terminal.Terminal,
    Terminal.make({
      columns: Effect.succeed(80),
      rows: Effect.succeed(24),
      readInput: Effect.die("unused"),
      readLine: Effect.die("unused"),
      display: () => Effect.void
    })
  )
)

/** The real orchestrator over stubbed pnpm, git, GitHub, registry and workspace. */
const appLayer = (options: {
  readonly plan: ReleasePlan
  readonly published: ReadonlySet<string>
  readonly staged?: ReadonlyArray<StagedItem>
}) => {
  const calls = makeCalls()
  /** The publish commands are covered in PublishCli.test.ts; here the service only satisfies the CLI's requirement. */
  const publication = Layer.succeed(
    Publication,
    Publication.of({
      readiness: () => Effect.die("release readiness is not exercised by these tests"),
      publish: () => Effect.die("release publish is not exercised by these tests")
    })
  )
  const layer = Layer.mergeAll(Release.layer, publication).pipe(
    Layer.provideMerge(Layer.mergeAll(
      pnpmLayer(calls, { plan: options.plan, applied: [] }),
      gitLayer(calls),
      githubLayer(calls),
      registryLayer(calls, { published: options.published, staged: options.staged }),
      workspaceLayer(calls, packages)
    )),
    Layer.provideMerge(cliEnvironment)
  )
  return { calls, layer }
}

const run = (args: ReadonlyArray<string>) => Command.runWith(cli, { version: "0.0.0", renderErrors: false })(args)

const mutationNames = (calls: ReturnType<typeof makeCalls>) =>
  callNames(calls).filter((name) =>
    name.startsWith("git.") ||
    name.startsWith("github.") ||
    name === "pnpm.applyVersions" ||
    name === "pnpm.stagePublish"
  )

describe("release run", () => {
  it.effect("opens the version PR and stages nothing while intents are pending", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: rcPlan, published: new Set() })
      yield* run(["run", "--tag", "rc"]).pipe(Effect.provide(layer))

      assert.strictEqual(callsTo(calls, "github.createPullRequest").length, 1)
      assert.deepStrictEqual(callsTo(calls, "pnpm.stagePublish"), [])
      assert.include(callNames(calls), "pnpm.applyVersions")
    }))

  it.effect("stages exactly the unpublished, unstaged public packages after the version PR merges", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({
        plan: emptyPlan,
        published: new Set(["@effect/vitest@4.0.0-rc.117"]),
        staged: []
      })
      yield* run(["run", "--tag", "rc"]).pipe(Effect.provide(layer))

      const [input] = callsTo(calls, "pnpm.stagePublish")[0].args as [
        { tag: string; packages: ReadonlyArray<string>; dryRun?: boolean }
      ]
      assert.strictEqual(input.tag, "rc")
      assert.deepStrictEqual(input.packages, ["effect"])
      assert.notStrictEqual(input.dryRun, true)
      assert.deepStrictEqual(callsTo(calls, "github.findPullRequest"), [])
      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
      assert.deepStrictEqual(callsTo(calls, "pnpm.applyVersions"), [])
      assert.deepStrictEqual(callsTo(calls, "git.resetBranch"), [])
    }))

  it.effect("passes --dry-run through to staging only", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: emptyPlan, published: new Set() })
      yield* run(["run", "--tag", "rc", "--dry-run"]).pipe(Effect.provide(layer))

      const [input] = callsTo(calls, "pnpm.stagePublish")[0].args as [{ dryRun?: boolean }]
      assert.strictEqual(input.dryRun, true)
    }))

  it.effect("does nothing when everything is published or already staged", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({
        plan: emptyPlan,
        published: new Set(["@effect/vitest@4.0.0-rc.117"]),
        staged: [stagedItem("effect", "4.0.0-rc.117", "validating")]
      })
      yield* run(["run", "--tag", "rc"]).pipe(Effect.provide(layer))

      assert.deepStrictEqual(callsTo(calls, "pnpm.stagePublish"), [])
      assert.deepStrictEqual(callsTo(calls, "pnpm.applyVersions"), [])
      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
      assert.deepStrictEqual(callsTo(calls, "github.updatePullRequest"), [])
    }))

  it.effect("fails before staging when a stale staged version exists", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({
        plan: emptyPlan,
        published: new Set(),
        staged: [stagedItem("effect", "4.0.0-rc.116")]
      })
      const error = yield* Effect.flip(run(["run", "--tag", "rc"]).pipe(Effect.provide(layer)))

      assert.strictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.deepStrictEqual(callsTo(calls, "pnpm.stagePublish"), [])
    }))

  it.effect("requires --tag", () =>
    Effect.gen(function*() {
      const { layer } = appLayer({ plan: emptyPlan, published: new Set() })
      const error = yield* Effect.flip(run(["run"]).pipe(Effect.provide(layer)))
      assert.notStrictEqual((error as { _tag: string })._tag, "ReleaseError")
    }))

  it.effect("rejects expected Version when routing chooses Stage without mutating anything", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({
        plan: emptyPlan,
        published: new Set(["@effect/vitest@4.0.0-rc.117"]),
        staged: []
      })
      const error = yield* Effect.flip(
        run(["run", "--tag", "rc", "--expect", "Version"]).pipe(Effect.provide(layer))
      )

      assert.strictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.include((error as Error).message, "Version")
      assert.include((error as Error).message, "Stage")
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("rejects expected Stage when routing chooses Version without mutating anything", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: rcPlan, published: new Set() })
      const error = yield* Effect.flip(
        run(["run", "--tag", "rc", "--expect", "Stage"]).pipe(Effect.provide(layer))
      )

      assert.strictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.include((error as Error).message, "Stage")
      assert.include((error as Error).message, "Version")
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("rejects expected Stage when routing chooses Idle without mutating anything", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({
        plan: emptyPlan,
        published: new Set(["effect@4.0.0-rc.117", "@effect/vitest@4.0.0-rc.117"]),
        staged: []
      })
      const error = yield* Effect.flip(
        run(["run", "--tag", "rc", "--expect", "Stage"]).pipe(Effect.provide(layer))
      )

      assert.strictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.include((error as Error).message, "Stage")
      assert.include((error as Error).message, "Idle")
      assert.deepStrictEqual(mutationNames(calls), [])
    }))

  it.effect("runs when the expected Version route matches", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: rcPlan, published: new Set() })
      yield* run(["run", "--tag", "rc", "--expect", "Version"]).pipe(Effect.provide(layer))

      assert.strictEqual(callsTo(calls, "github.createPullRequest").length, 1)
      assert.deepStrictEqual(callsTo(calls, "pnpm.stagePublish"), [])
    }))

  it.effect("runs when the expected Stage route matches", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: emptyPlan, published: new Set(), staged: [] })
      yield* run(["run", "--tag", "rc", "--expect", "Stage"]).pipe(Effect.provide(layer))

      assert.strictEqual(callsTo(calls, "pnpm.stagePublish").length, 1)
      assert.deepStrictEqual(callsTo(calls, "github.createPullRequest"), [])
    }))

  it.effect("prints the version PR title on a dry run without touching git or GitHub", () =>
    Effect.gen(function*() {
      const { calls, layer } = appLayer({ plan: rcPlan, published: new Set() })
      yield* run(["run", "--tag", "rc", "--dry-run"]).pipe(Effect.provide(layer))

      assert.include((yield* TestConsole.logLines).join("\n"), "Version Packages (rc)")
      assert.deepStrictEqual(
        callNames(calls).filter((name) => name.startsWith("git.") || name.startsWith("github.")),
        []
      )
      assert.deepStrictEqual(callsTo(calls, "pnpm.applyVersions"), [])
    }))
})
