import { cli } from "@effect/api-diff"
import { ApiDiff } from "@effect/api-diff/ApiDiff"
import type { ApiSnapshot } from "@effect/api-diff/Model"
import { Worktrees } from "@effect/api-diff/Worktrees"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Command from "effect/unstable/cli/Command"

const snapshot = (ref: string, sha: string): ApiSnapshot => ({
  version: 1,
  compiler: { name: "typescript", version: "fixture" },
  ref,
  sha,
  packages: [],
  entrypoints: [],
  entities: [],
  diagnostics: []
})

const WorktreesTest = Layer.succeed(
  Worktrees,
  Worktrees.of({
    resolveRef: (_repoRoot, ref) => Effect.succeed(ref.repeat(40).slice(0, 40)),
    prepareSnapshot: (options) => Effect.succeed(snapshot(options.ref, options.sha))
  })
)

const MainLayer = ApiDiff.layerNoDependencies.pipe(
  Layer.provide(WorktreesTest),
  Layer.provideMerge(NodeServices.layer)
)

it.effect("compares refs without a migration map", () =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = yield* fs.makeTempDirectoryScoped({ prefix: "api-diff-cli-" })
    const output = path.join(root, "output")

    yield* Command.runWith(cli, { version: "0.0.0" })([
      "--base-ref",
      "a",
      "--head-ref",
      "b",
      "--output",
      output
    ])

    const diff = JSON.parse(yield* fs.readFileString(path.join(output, "diff.json")))
    assert.deepStrictEqual(diff.base, { ref: "a", sha: "a".repeat(40) })
    assert.deepStrictEqual(diff.head, { ref: "b", sha: "b".repeat(40) })
  }).pipe(Effect.provide(MainLayer)))
