import { assert, describe, it } from "@effect/vitest"
import { Effect, Result, Schema, SchemaAST, SchemaParser } from "effect"
import * as Codegen from "effect/internal/schema/codegen"
import * as CompilerRegistry from "effect/internal/schema/compilerRegistry"
import * as SchemaAOTCompiler from "effect/schema/SchemaAOTCompiler"
import * as SchemaTransformation from "effect/SchemaTransformation"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { roots, schemas, suspendEvaluations } from "./fixtures/aot.ts"

const compileDecode = (schema: Schema.Constraint): string =>
  SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode"] }])

/** Emitted names are numbered per module, so compare shapes rather than names. */
const anonymize = (source: string): string =>
  source
    .replace(/\b[vi]\d*\b/g, "x")
    .replace(/\bd\d+\b/g, "d")
    .replace(/\bu\d+\b/g, "u")
    .replace(/C\[\d+\]/g, "C[]")

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
    assert.include(source, "effect/schema/SchemaCompiler/runtime")
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

  it("honors enumerable excess checking directly in generated operations", async () => {
    const visible = Symbol("visible")
    const hidden = Symbol("hidden")
    const schema = Schema.StructWithRest(Schema.Struct({ fixed: Schema.optionalKey(Schema.String) }), [
      Schema.Record(Schema.TemplateLiteral(["field-", Schema.Number]), Schema.Number),
      Schema.Record(Schema.Symbol, Schema.Number)
    ])
    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-excess-test-", import.meta.url)))
    try {
      const file = join(directory, "decode.mjs")
      writeFileSync(file, SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is"] }]))
      const generated = await import(pathToFileURL(file).href)
      generated.install([schema.ast])
      const { decode, is } = CompilerRegistry.resolve(schema.ast)
      assert.ok(decode, "Expected a compiled decoder")
      assert.ok(is, "Expected a compiled type guard")
      const strict = { onExcessProperty: "error" } as const
      const expected = { "field-1": 1, [visible]: 2 }
      const input = Object.defineProperties({ ...expected }, {
        fixed: { value: "declared", enumerable: false },
        "field-2": { value: "invalid", enumerable: false },
        [hidden]: {
          enumerable: false,
          get() {
            throw new Error("Non-enumerable properties must not be read")
          }
        }
      })
      for (const options of [SchemaAST.defaultParseOptions, strict]) {
        assert.deepStrictEqual(decode(input, options), { ...expected, fixed: "declared" })
        assert.isTrue(is(input, options))
        assert.strictEqual(decode({ [visible]: "invalid" }, options), CompilerRegistry.invalid)
      }
      assert.strictEqual(decode({ ...expected, extra: 1 }, strict), CompilerRegistry.invalid)
      assert.isFalse(is({ ...expected, extra: 1 }, strict))
      assert.deepStrictEqual(decode({}, strict), {})
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

  it("emits a presence check only where undefined is accepted", () => {
    const presence = "if(!(\"a\" in i))return I"
    const accepting: ReadonlyArray<Schema.Constraint> = [
      Schema.Undefined,
      Schema.Void,
      Schema.Any,
      Schema.Unknown,
      Schema.UndefinedOr(Schema.String),
      Schema.Union([Schema.String, Schema.Number, Schema.Undefined])
    ]
    for (const type of accepting) {
      assert.include(compileDecode(Schema.Struct({ a: type, b: Schema.String })), presence, type.ast._tag)
    }

    const rejecting: ReadonlyArray<Schema.Constraint> = [
      Schema.String,
      Schema.Null,
      Schema.Union([Schema.String, Schema.Number]),
      Schema.Number.pipe(Schema.withConstructorDefault(Effect.succeed(1)))
    ]
    for (const type of rejecting) {
      assert.notInclude(compileDecode(Schema.Struct({ a: type, b: Schema.String })), presence, type.ast._tag)
    }

    const optional = compileDecode(Schema.Struct({ a: Schema.optionalKey(Schema.String), b: Schema.String }))
    assert.notInclude(optional, presence)
    assert.include(optional, "if(\"a\" in i){const v1=i[\"a\"];if(typeof v1!==\"string\")return I;v0[\"a\"]=v1}")

    const predicate = SchemaAOTCompiler.compile([
      { ast: Schema.Struct({ a: Schema.Any, b: Schema.String }).ast, operations: ["is"] }
    ])
    assert.include(predicate, "if(!(\"a\" in i))return false")

    const proto = compileDecode(Schema.Struct({ ["__proto__"]: Schema.String, b: Schema.String }))
    assert.include(proto, "if(!(Object.hasOwn(i,\"__proto__\")))return I")
  })

  it("emits the same presence check for a nested struct property", () => {
    const source = compileDecode(Schema.Struct({ outer: Schema.Struct({ a: Schema.Any, b: Schema.String }) }))
    assert.include(source, "const v1=i[\"outer\"]")
    assert.include(source, "if(!(\"a\" in v1))return I")
    assert.notInclude(source, "if(!(\"outer\" in i))return I")
  })

  it("emits property code that does not depend on nesting depth", () => {
    const leaf = () => Schema.Struct({ a: Schema.optionalKey(Schema.String), b: Schema.UndefinedOr(Schema.Number) })
    const nest = (depth: number) => {
      let schema: Schema.Constraint = leaf()
      for (let level = 0; level < depth; level++) schema = Schema.Struct({ n: schema })
      return schema
    }
    const opening = "const x={};if(\"a\" in x)"
    const closing = "x[\"b\"]=x;"
    const fragment = (depth: number) => {
      const source = anonymize(compileDecode(nest(depth)))
      const start = source.indexOf(opening)
      assert.notStrictEqual(start, -1, `depth ${depth}`)
      const end = source.indexOf(closing, start)
      assert.notStrictEqual(end, -1, `depth ${depth}`)
      return source.slice(start, end + closing.length)
    }
    const expected = fragment(0)
    assert.include(expected, "if(!(\"b\" in x))return I")
    for (const depth of [1, 2, 4, 8]) {
      assert.strictEqual(fragment(depth), expected, `depth ${depth}`)
    }
  })

  it("skips generation for schemas the emitter cannot support", () => {
    const declaration = SchemaAOTCompiler.compile([
      { ast: Schema.Struct({ a: Schema.Option(Schema.String) }).ast, operations: ["decode", "is", "make"] }
    ])
    assert.notInclude(declaration, "case \"decode\":{")
    assert.notInclude(declaration, "case \"is\":{")
    assert.include(declaration, "case \"decodeEffect\":{")

    const fields: Record<string, Schema.Constraint> = {}
    for (let index = 0; index <= Codegen.maxGeneratedNodes; index++) fields[`k${index}`] = Schema.String
    const oversized = compileDecode(Schema.Struct(fields))
    assert.notInclude(oversized, "case \"decode\":{")
    assert.include(oversized, "case \"decodeEffect\":{")
  })

  it("runs generated presence checks for every key state", async () => {
    const undefinedOr = Schema.Struct({ a: Schema.UndefinedOr(Schema.String), b: Schema.String })
    const optional = Schema.Struct({ a: Schema.optionalKey(Schema.String), b: Schema.String })
    const wide = Schema.Struct({ a: Schema.Any, b: Schema.String })
    const proto = Schema.Struct({ ["__proto__"]: Schema.String })
    const cases = { undefinedOr, optional, wide, proto }

    const directory = mkdtempSync(fileURLToPath(new URL("../../.schema-aot-presence-test-", import.meta.url)))
    try {
      for (const [name, schema] of Object.entries(cases)) {
        const file = join(directory, `${name}.mjs`)
        writeFileSync(
          file,
          SchemaAOTCompiler.compile([{ ast: schema.ast, operations: ["decode", "is", "make"] }])
        )
        const generated = await import(`${pathToFileURL(file).href}?test=${Date.now()}`)
        generated.install([schema.ast])
        assert.strictEqual(typeof CompilerRegistry.resolve(schema.ast).compiled, "function", name)
      }

      const decodeUndefinedOr = SchemaParser.decodeUnknownResult(undefinedOr)
      assert.isTrue(Result.isFailure(decodeUndefinedOr({ b: "x" })))
      assert.deepStrictEqual(decodeUndefinedOr({ a: undefined, b: "x" }), Result.succeed({ a: undefined, b: "x" }))
      assert.deepStrictEqual(decodeUndefinedOr({ a: "v", b: "x" }), Result.succeed({ a: "v", b: "x" }))
      assert.isFalse(SchemaParser.is(undefinedOr)({ b: "x" }))
      assert.isTrue(SchemaParser.is(undefinedOr)({ a: undefined, b: "x" }))
      assert.deepStrictEqual(SchemaParser.encodeUnknownSync(undefinedOr)({ a: undefined, b: "x" }), {
        a: undefined,
        b: "x"
      })
      assert.deepStrictEqual(SchemaParser.make(undefinedOr)({ a: undefined, b: "x" }), { a: undefined, b: "x" })

      const decodeOptional = SchemaParser.decodeUnknownResult(optional)
      const absent = decodeOptional({ b: "x" })
      assert.deepStrictEqual(absent, Result.succeed({ b: "x" }))
      assert.isFalse(Object.hasOwn(Result.getOrThrow(absent), "a"))
      assert.isTrue(Result.isFailure(decodeOptional({ a: undefined, b: "x" })))
      assert.deepStrictEqual(decodeOptional({ a: "v", b: "x" }), Result.succeed({ a: "v", b: "x" }))
      assert.isTrue(SchemaParser.is(optional)({ b: "x" }))
      assert.isFalse(SchemaParser.is(optional)({ a: undefined, b: "x" }))
      assert.deepStrictEqual(SchemaParser.make(optional)({ b: "x" }), { b: "x" })

      const decodeWide = SchemaParser.decodeUnknownResult(wide)
      assert.isTrue(Result.isFailure(decodeWide({ b: "x" })))
      assert.deepStrictEqual(decodeWide({ a: undefined, b: "x" }), Result.succeed({ a: undefined, b: "x" }))
      assert.deepStrictEqual(decodeWide({ a: 1, b: "x" }), Result.succeed({ a: 1, b: "x" }))
      assert.isFalse(SchemaParser.is(wide)({ b: "x" }))
      assert.isTrue(SchemaParser.is(wide)({ a: undefined, b: "x" }))

      const decodeProto = SchemaParser.decodeUnknownResult(proto)
      assert.isTrue(Result.isFailure(decodeProto({})))
      assert.isTrue(Result.isFailure(decodeProto(Object.create({ ["__proto__"]: "inherited" }))))
      const own = decodeProto(JSON.parse("{\"__proto__\":\"v\"}"))
      assert.isTrue(Result.isSuccess(own))
      assert.strictEqual(Object.getOwnPropertyDescriptor(Result.getOrThrow(own), "__proto__")?.value, "v")
      assert.isFalse(SchemaParser.is(proto)({}))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
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
