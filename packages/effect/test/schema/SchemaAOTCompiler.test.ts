import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaParser } from "effect"
import * as CompilerRegistry from "effect/internal/schema/compilerRegistry"
import * as SchemaTransformation from "effect/SchemaTransformation"
import * as SchemaAOTCompiler from "effect/unstable/schema/SchemaAOTCompiler"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { roots, schemas, suspendEvaluations } from "./fixtures/aot.ts"

describe("SchemaAOTCompiler", { concurrent: false }, () => {
  it("emits deterministic modules without installing a decoder", () => {
    let checks = 0
    const schema = Schema.Struct({
      value: Schema.String.check(Schema.makeFilter(() => {
        checks++
        return true
      }))
    })
    const before = CompilerRegistry.resolve(schema.ast)
    const targets = [{ ast: schema.ast, operations: ["decode"] }] as const
    const source = SchemaAOTCompiler.compile(targets)
    assert.strictEqual(SchemaAOTCompiler.compile(targets), source)
    assert.strictEqual(CompilerRegistry.resolve(schema.ast), before)
    assert.strictEqual(checks, 0)
    assert.include(source, "effect/unstable/schema/SchemaCompiler/runtime")
    assert.notInclude(source, "new Function")
    assert.notInclude(source, "SchemaJITCompiler")
  })

  it("emits only the requested operation family", () => {
    const schema = Schema.Struct({ value: Schema.String })
    const decode = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }])
    assert.include(decode, "case \"decode\":{")
    assert.include(decode, "case \"decodeEffect\":{")
    assert.notInclude(decode, "case \"is\":{")
    assert.notInclude(decode, "case \"make\":{")
    assert.notInclude(decode, "case \"makeEffect\":{")

    const make = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["make"] }])
    assert.include(make, "case \"make\":{")
    assert.include(make, "case \"makeEffect\":{")
    assert.notInclude(make, "case \"is\":{")
    assert.notInclude(make, "case \"decode\":{")
  })

  it("allows a target without requested operations", () => {
    const schema = Schema.Struct({ value: Schema.String })
    const source = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: [] }])
    assert.notInclude(source, "runtime.setCompiler(")
  })

  it("omits fast decode operations from diagnostic-only dependencies", () => {
    const child = Schema.Struct({ value: Schema.String })
    const schema = Schema.Array(child)
    const source = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }])
    assert.strictEqual(source.match(/case "decode":\{/g)?.length, 1)
    assert.strictEqual(source.match(/case "decodeEffect":\{/g)?.length, 2)

    const targeted = SchemaAOTCompiler.compile([
      { ast: schema.ast, operations: ["decode"] },
      { ast: child.ast, operations: ["decode"] }
    ])
    assert.strictEqual(targeted.match(/case "decode":\{/g)?.length, 2)
    assert.strictEqual(targeted.match(/case "decodeEffect":\{/g)?.length, 2)
  })

  it("uses registry fallbacks for operations that were not requested", async () => {
    const schema = Schema.Struct({ value: Schema.String })
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-operations-test-", import.meta.url)))
    try {
      const file = join(directory, "decode.mjs")
      writeFileSync(file, SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }]))
      const generated = await import(`${pathToFileURL(file).href}?test=${Date.now()}`)
      generated.install([schema.ast])

      const entry = CompilerRegistry.resolve(schema.ast)
      assert.strictEqual(typeof entry.compiled, "function")
      assert.isDefined(entry.decode)
      assert.isUndefined(entry.is)
      assert.isUndefined(entry.make)
      assert.strictEqual(SchemaParser.is(schema)({ value: "a" }), true)
      assert.deepStrictEqual(SchemaParser.make(schema)({ value: "a" }), { value: "a" })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("initializes dependency operations on first use", async () => {
    const child = Schema.String.pipe(
      Schema.decodeTo(
        Schema.Number,
        SchemaTransformation.transform({ decode: Number, encode: String })
      ),
      Schema.annotate({ title: "lazy AOT dependency" })
    )
    const schema = Schema.Struct({ child })
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-lazy-test-", import.meta.url)))
    try {
      const file = join(directory, "decode.mjs")
      writeFileSync(file, SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }]))
      const generated = await import(`${pathToFileURL(file).href}?test=${Date.now()}`)
      generated.install([schema.ast])

      const dependency = CompilerRegistry.resolve(child.ast)
      assert.isFalse(Object.hasOwn(dependency, "decodeEffect"))

      const decode = SchemaParser.decodeUnknownSync(schema)
      assert.deepStrictEqual(decode({ child: "1" }), { child: 1 })
      assert.isFalse(Object.hasOwn(dependency, "decodeEffect"))

      assert.throws(() => decode({ child: false }))
      assert.isTrue(Object.hasOwn(dependency, "decodeEffect"))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("deduplicates repeated roots and dependencies shared across roots", () => {
    const child = Schema.Struct({ value: Schema.String })
    const first = Schema.Struct({ child })
    const second = Schema.Array(child)
    const source = SchemaAOTCompiler.compile([
      { ast: first.ast, operations: ["decode"] },
      { ast: second.ast, operations: ["decode"] }
    ])
    assert.strictEqual(
      SchemaAOTCompiler.compile([
        { ast: first.ast, operations: ["decode"] },
        { ast: second.ast, operations: ["decode"] },
        { ast: first.ast, operations: ["decode"] },
        { ast: second.ast, operations: ["decode"] }
      ]),
      source
    )
    assert.strictEqual(source.match(/runtime\.setCompiler\(/g)?.length, 3)
  })

  it("reuses identical decoder factories", () => {
    const schema = Schema.Union(
      Array.from({ length: 8 }, (_, tag) => Schema.Struct({ tag: Schema.Literal(tag), value: Schema.Number }))
    )
    const source = SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }])
    assert.strictEqual(source.match(/function d\d+\(ast,resolve,operation\)/g)?.length, 2)
  })

  it("runs generated decoders without dynamic code generation", () => {
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-test-", import.meta.url)))
    try {
      for (const [name, schema] of Object.entries(schemas)) {
        writeFileSync(
          join(directory, `${name}.mjs`),
          SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is", "make"] }])
        )
      }
      writeFileSync(
        join(directory, "all.mjs"),
        SchemaAOTCompiler.compile(roots.map((ast) => ({ ast, operations: ["decode", "is", "make"] })))
      )
      writeFileSync(join(directory, "empty.mjs"), SchemaAOTCompiler.compile([]))
      assert.strictEqual(suspendEvaluations, 0)
      for (const mode of ["single", "multiple"]) {
        const output = execFileSync(process.execPath, [
          "--disallow-code-generation-from-strings",
          "--import",
          fileURLToPath(new URL("./fixtures/aot-import-guard.ts", import.meta.url)),
          fileURLToPath(new URL("./fixtures/aot-runner.ts", import.meta.url)),
          directory,
          mode
        ], { encoding: "utf8" })
        assert.include(output, "AOT integration passed")
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 20_000)
})
