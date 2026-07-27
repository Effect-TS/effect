import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { describe, it } from "node:test"
import { pathToFileURL } from "node:url"
import { loadRegistry } from "../utils.mts"

const astTags = [
  "Declaration",
  "Null",
  "Undefined",
  "Void",
  "Never",
  "Unknown",
  "Any",
  "String",
  "Number",
  "Boolean",
  "BigInt",
  "Symbol",
  "Literal",
  "UniqueSymbol",
  "ObjectKeyword",
  "Enum",
  "TemplateLiteral",
  "Arrays",
  "Objects",
  "Union",
  "Suspend"
]

describe("runtimeperf registry", () => {
  it("covers every SchemaAST tag in tier 0", () => {
    const { fixtures } = loadRegistry()
    const covered = new Set(
      fixtures
        .filter((fixture) => fixture.tier === 0 && fixture.implementation === "effect")
        .flatMap((fixture) => fixture.astTags)
    )
    assert.deepEqual([...covered].sort(), astTags.slice().sort())
  })

  it("uses unique fixture targets and valid implementations", () => {
    const { fixtures } = loadRegistry()
    assert.equal(new Set(fixtures.map((fixture) => fixture.target)).size, fixtures.length)
    for (const fixture of fixtures) {
      assert.ok(["effect", "typebox", "valibot", "zod4"].includes(fixture.implementation))
    }
  })

  it("covers cold union scenarios with every comparison implementation", () => {
    const { fixtures } = loadRegistry()
    for (const scenario of ["first-decode-literal-100", "first-decode-tagged-100"]) {
      assert.deepEqual(
        fixtures
          .filter((fixture) => fixture.scenario === scenario)
          .map((fixture) => fixture.implementation)
          .sort(),
        ["effect", "typebox", "valibot", "zod4"]
      )
    }
  })

  it("uses Zod 4 standard in jitless mode for the zod4 fixtures", async () => {
    const { fixtures } = loadRegistry()
    const zodFiles = new Set(
      fixtures
        .filter((fixture) => fixture.implementation === "zod4")
        .map((fixture) => fixture.fixturePath)
    )
    assert.ok(zodFiles.size > 0)
    for (const path of zodFiles) {
      const source = await readFile(path, "utf8")
      assert.match(source, /from "zod\/v4"/)
      assert.doesNotMatch(source, /from "zod\/v4-mini"/)
      assert.match(source, /jitless:\s*true/)
    }
  })

  it("uses TypeBox Value.Errors without compilation for the typebox fixtures", async () => {
    const { fixtures } = loadRegistry()
    const typeboxFiles = new Set(
      fixtures
        .filter((fixture) => fixture.implementation === "typebox")
        .map((fixture) => fixture.fixturePath)
    )
    assert.ok(typeboxFiles.size > 0)
    for (const path of typeboxFiles) {
      const source = await readFile(path, "utf8")
      assert.match(source, /from "typebox\/value"/)
      assert.match(source, /TypeBoxValue\.Errors/)
      assert.doesNotMatch(source, /from "typebox\/schema"/)
      assert.doesNotMatch(source, /\.Compile\(/)
    }
  })

  it("uses SchemaIssue results for Effect cross-library decoding fixtures", async () => {
    const { fixtures } = loadRegistry()
    const scenarios = Map.groupBy(fixtures, (fixture) => fixture.scenario)
    const comparisonFiles = new Set(
      fixtures
        .filter((fixture) =>
          fixture.implementation === "effect" &&
          fixture.operation === "decode" &&
          (scenarios.get(fixture.scenario)?.length ?? 0) > 1
        )
        .map((fixture) => fixture.fixturePath)
    )
    assert.ok(comparisonFiles.size > 0)
    for (const path of comparisonFiles) {
      const source = await readFile(path, "utf8")
      assert.match(source, /SchemaParser\.decodeUnknownExit/)
      assert.doesNotMatch(source, /Schema\.decodeUnknownExit/)
    }
  })

  it("loads, runs and validates every fixture export", async () => {
    const { fixtures } = loadRegistry()
    const modules = new Map()
    for (const fixture of fixtures) {
      let module = modules.get(fixture.fixturePath)
      if (module === undefined) {
        module = await import(pathToFileURL(fixture.fixturePath))
        modules.set(fixture.fixturePath, module)
      }
      assert.equal(typeof module[fixture.export], "function", fixture.target)
      const runtimeCase = module[fixture.export]()
      const result = runtimeCase.run()
      assert.equal(typeof result?.then, "undefined", fixture.target)
      runtimeCase.validate(result)
    }
  })
})
