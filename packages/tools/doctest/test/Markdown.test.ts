import * as Doctest from "@effect/doctest/Plugin"
import * as Protocol from "@effect/doctest/Protocol"
import { assert, describe, it } from "@effect/vitest"
import { rejects } from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { SourceMap } from "node:module"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { compileFunction } from "node:vm"

describe("Markdown snippet compilation", () => {
  it("lowers TypeScript without changing the snippet identity and maps to the document line", async () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-markdown-"))
    try {
      const file = join(root, "example.md")
      writeFileSync(file, "# Example\n\n```ts import.meta.vitest\nconst local: number = 42\nrecord(local)\n```\n")
      const plugin = Doctest.plugin()
      const resolveId = plugin.resolveId
      const load = plugin.load
      if (typeof resolveId !== "function" || typeof load !== "function") {
        return assert.fail("expected function plugin hooks")
      }
      const context = { addWatchFile() {} } as never
      const collector = Protocol.resolvedId("collector", { file, version: "test" })
      await load.call(context, collector, {} as never)
      const resolved = await resolveId.call(context, Protocol.snippetId(file, 0, "test"), undefined, {} as never)
      assert.strictEqual(resolved, Protocol.resolvedId("snippet", { file, index: 0, version: "test" }))
      if (typeof resolved !== "string") return assert.fail("expected string ID")
      const output = await load.call(context, resolved, {} as never)
      if (output === null || typeof output !== "object") return assert.fail("expected compiled snippet")
      const values: Array<unknown> = []
      compileFunction(output.code, ["record"])((value: unknown) => values.push(value))
      assert.deepStrictEqual(values, [42])
      if (output.map === null || output.map === undefined || typeof output.map === "string") {
        return assert.fail("expected source map")
      }
      assert.deepStrictEqual(output.map.sources, [file])
      const line = output.code.split("\n").findIndex((line) => line.includes("record(local)"))
      const mapping = new SourceMap({
        version: 3,
        file,
        sourceRoot: "",
        sources: output.map.sources?.map((source) => source ?? "") ?? [],
        sourcesContent: output.map.sourcesContent?.map((source) => source ?? "") ?? [],
        names: output.map.names ?? [],
        mappings: output.map.mappings
      }).findEntry(line, 0)
      assert.deepInclude(mapping, { originalSource: file, originalLine: 4 })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("leaves normal TypeScript snippets for Vite to compile once", async () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-typescript-"))
    try {
      const file = join(root, "example.ts")
      writeFileSync(file, "/**\n * ```ts import.meta.vitest\n * const local: number = 42\n * ```\n */\n")
      const load = Doctest.plugin().load
      if (typeof load !== "function") return assert.fail("expected load hook")
      const output = await load.call(
        { addWatchFile() {} } as never,
        Protocol.resolvedId("snippet", { file, index: 0, version: "test" }),
        {} as never
      )
      assert.strictEqual(output, "const local: number = 42")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("reports invalid TypeScript using the document filename and line", async () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-invalid-"))
    try {
      const file = join(root, "example.md")
      writeFileSync(file, "# Example\n\n```ts import.meta.vitest\nconst local: = 42\n```\n")
      const load = Doctest.plugin().load
      if (typeof load !== "function") return assert.fail("expected load hook")
      await rejects(
        Promise.resolve(load.call(
          { addWatchFile() {} } as never,
          Protocol.resolvedId("snippet", { file, index: 0, version: "test" }),
          {} as never
        )),
        (error: unknown) => {
          assert.include(String(error), `${relative(process.cwd(), file)}:4:14`)
          return true
        }
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
