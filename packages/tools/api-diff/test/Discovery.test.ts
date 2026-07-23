import { discoverEntrypoints } from "@effect/api-diff/Discovery"
import { assert, describe, it } from "@effect/vitest"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFixturePackage } from "./utils.ts"

describe("entrypoint discovery", () => {
  it("expands wildcards and respects null exclusions", () => {
    const root = mkdtempSync(join(tmpdir(), "api-diff-discovery-"))
    writeFixturePackage(root, {
      "index.d.ts": `export * as Foo from "./Foo.js"\n`,
      "Foo.d.ts": `export declare const value: string\n`,
      "internal/Secret.d.ts": `export declare const secret: string\n`
    })

    const result = discoverEntrypoints(root, [
      "@fixture/sample",
      "@fixture/sample/Foo",
      "@fixture/sample/internal/Secret"
    ])
    assert.deepStrictEqual(result.entrypoints.map((entrypoint) => entrypoint.module), [
      "@fixture/sample",
      "@fixture/sample/Foo"
    ])
    assert.deepStrictEqual(result.missing, ["@fixture/sample/internal/Secret"])
  })

  it("supports conditional export targets", () => {
    const root = mkdtempSync(join(tmpdir(), "api-diff-discovery-"))
    writeFixturePackage(root, {
      "Foo.d.ts": `export declare const value: string\n`
    }, {
      "./Foo": {
        types: "./Foo.d.ts",
        import: "./Foo.js"
      }
    })
    const result = discoverEntrypoints(root, ["@fixture/sample/Foo"])
    assert.strictEqual(result.missing.length, 0)
    assert.strictEqual(result.entrypoints[0]?.module, "@fixture/sample/Foo")
  })
})
