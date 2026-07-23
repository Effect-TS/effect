import { cli } from "@effect/api-diff"
import { renderMigrationMarkdown } from "@effect/api-diff/Mapping"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Command from "effect/unstable/cli/Command"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

it.effect("generates mapping documentation through the Cli command", () =>
  Effect.gen(function*() {
    const root = mkdtempSync(join(tmpdir(), "api-diff-cli-"))
    const mappingPath = join(root, "mapping.json")
    const outputPath = join(root, "mapping.md")
    const mapping = { version: 1 as const, modules: [], apis: [] }
    writeFileSync(mappingPath, JSON.stringify(mapping))

    yield* Command.runWith(cli, { version: "0.0.0" })([
      "--mapping",
      mappingPath,
      "--write-mapping-doc",
      outputPath
    ]).pipe(Effect.provide(NodeServices.layer))

    assert.strictEqual(readFileSync(outputPath, "utf8"), renderMigrationMarkdown(mapping))
  }))
