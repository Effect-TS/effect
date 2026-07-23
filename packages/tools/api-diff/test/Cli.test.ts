import { cli } from "@effect/api-diff"
import { ApiDiff } from "@effect/api-diff/ApiDiff"
import { renderMigrationMarkdown } from "@effect/api-diff/Mapping"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Command from "effect/unstable/cli/Command"

const MainLayer = ApiDiff.layer.pipe(
  Layer.provideMerge(NodeServices.layer)
)

it.effect("generates mapping documentation through the Cli command", () =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const root = yield* fs.makeTempDirectoryScoped({ prefix: "api-diff-cli-" })
    const mappingPath = path.join(root, "mapping.json")
    const outputPath = path.join(root, "mapping.md")
    const mapping = { version: 1 as const, modules: [], apis: [] }
    yield* fs.writeFileString(mappingPath, JSON.stringify(mapping))

    yield* Command.runWith(cli, { version: "0.0.0" })([
      "--mapping",
      mappingPath,
      "--write-mapping-doc",
      outputPath
    ])

    assert.strictEqual(yield* fs.readFileString(outputPath), renderMigrationMarkdown(mapping))
  }).pipe(Effect.provide(MainLayer)))
