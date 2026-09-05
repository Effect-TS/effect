import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema, SchemaAST, SchemaParser } from "effect"
import { SchemaCompiler, SchemaJITCompiler } from "effect/unstable/schema"
import { deepStrictEqual, strictEqual, throws } from "../utils/assert.ts"

describe("SchemaCompiler", () => {
  it("installs a decoder in the shared registry", () => {
    const schema = Schema.Struct({ value: Schema.String })
    const early = SchemaParser.decodeUnknownSync(schema)
    deepStrictEqual(early({ value: "interpreted" }), { value: "interpreted" })

    let decodes = 0
    SchemaCompiler.set(schema.ast, {
      is: () => true,
      validate: (_input, options) =>
        options.onExcessProperty === "preserve"
          ? { value: "compiled" }
          : SchemaCompiler.invalid,
      decode: () => {
        decodes++
        return Effect.succeed({ value: "detailed" })
      }
    })

    const late = SchemaParser.decodeUnknownSync(schema)
    deepStrictEqual(late({ value: 1 }, { onExcessProperty: "preserve" }), { value: "compiled" })
    deepStrictEqual(late({ value: 1 }), { value: "detailed" })
    strictEqual(decodes, 1)

    // Parsers that resolved the old entry before set keep using it.
    deepStrictEqual(early({ value: "interpreted" }), { value: "interpreted" })
  })

  it("uses is only for type guards", () => {
    const schema = Schema.Struct({ value: Schema.String })
    let validations = 0
    SchemaCompiler.set(schema.ast, {
      is: (input) => (input as { readonly value?: unknown }).value === "accepted",
      validate: (input) => {
        validations++
        return input
      },
      decode: Effect.succeed
    })

    strictEqual(SchemaParser.is(schema)({ value: "accepted" }), true)
    strictEqual(SchemaParser.is(schema)({ value: "rejected" }), false)
    deepStrictEqual(SchemaParser.decodeUnknownSync(schema)({ value: "decoded" }), { value: "decoded" })
    strictEqual(validations, 1)
  })

  it("exposes the canonical missing value to installed decoders", () => {
    const schema = Schema.Struct({ value: Schema.optionalKey(Schema.String) })
    assert(schema.ast._tag === "Objects")
    const value = schema.ast.propertySignatures[0].type
    let sawMissing = false
    SchemaCompiler.set(value, {
      validate: (input) => typeof input === "string" ? input : SchemaCompiler.invalid,
      decode: (input) => {
        sawMissing = input === SchemaCompiler.missing
        return Effect.succeed(input)
      }
    })

    deepStrictEqual(SchemaParser.decodeUnknownSync(schema)({}), {})
    strictEqual(sawMissing, true)
  })

  it("installs encoders on the flipped AST", () => {
    const schema = Schema.FiniteFromString
    SchemaCompiler.set(SchemaAST.flip(schema.ast), {
      validate: () => "aot",
      decode: () => Effect.succeed("detailed")
    })

    strictEqual(SchemaParser.encodeUnknownSync(schema)(1), "aot")
  })
})

describe("SchemaJITCompiler", () => {
  it("reuses option-independent generated functions for explicit options", () => {
    const schema = Schema.Struct({ nested: Schema.Struct({ value: Schema.String }) })
    const input = { nested: { value: "valid" } }
    const Function = globalThis.Function
    let constructions = 0
    try {
      globalThis.Function = ((...args: ReadonlyArray<string>) => {
        constructions++
        return Function(...args)
      }) as FunctionConstructor

      SchemaJITCompiler.enable(schema.ast)
      const decode = SchemaParser.decodeUnknownSync(schema)
      deepStrictEqual(decode(input), input)
      strictEqual(SchemaParser.is(schema)(input), true)
      const initialized = constructions
      assert(initialized > 1)
      for (const options of [{}, { reportInput: true }, { errors: "all" }, { disableChecks: true }] as const) {
        deepStrictEqual(decode(input, options), input)
        strictEqual(SchemaParser.is(schema, options)(input), true)
        strictEqual(constructions, initialized)
      }
    } finally {
      globalThis.Function = Function
    }
  })

  it("keeps generated operations lazy", () => {
    const schema = Schema.Struct({ value: Schema.String })
    const Function = globalThis.Function
    let constructions = 0
    try {
      globalThis.Function = ((...args: ReadonlyArray<string>) => {
        constructions++
        return Function(...args)
      }) as FunctionConstructor

      SchemaJITCompiler.enable(schema.ast)
      strictEqual(constructions, 1)
      deepStrictEqual(SchemaParser.decodeUnknownSync(schema)({ value: "valid" }), { value: "valid" })
      assert(constructions > 1)
    } finally {
      globalThis.Function = Function
    }
  })

  it("replaces only the selected AST and leaves resolved parsers intact", () => {
    const selected = Schema.Struct({ value: Schema.String })
    const untouched = Schema.Struct({ value: Schema.String })
    const early = SchemaParser.decodeUnknownSync(selected)
    deepStrictEqual(early({ value: "valid" }), { value: "valid" })

    SchemaJITCompiler.enable(selected.ast)

    let earlyReads = 0
    throws(() =>
      early({
        get value() {
          earlyReads++
          return 1
        }
      })
    )
    strictEqual(earlyReads, 1)

    let selectedReads = 0
    throws(() =>
      SchemaParser.decodeUnknownSync(selected)({
        get value() {
          selectedReads++
          return 1
        }
      })
    )
    strictEqual(selectedReads, 2)

    let untouchedReads = 0
    throws(() =>
      SchemaParser.decodeUnknownSync(untouched)({
        get value() {
          untouchedReads++
          return 1
        }
      })
    )
    strictEqual(untouchedReads, 1)
  })

  it("compiles descendants through an unsupported lazy root", () => {
    const child = Schema.Struct({ value: Schema.String })
    const schema = Schema.suspend(() => child)
    SchemaJITCompiler.enable(schema.ast)

    let reads = 0
    throws(() =>
      SchemaParser.decodeUnknownSync(schema)({
        get value() {
          reads++
          return 1
        }
      })
    )
    strictEqual(reads, 2)
  })

  it("preserves an installed decoder when dynamic code generation is unavailable", () => {
    const schema = Schema.Struct({ value: Schema.String })
    SchemaCompiler.set(schema.ast, {
      validate: () => ({ value: "installed" }),
      decode: () => Effect.succeed({ value: "installed" })
    })
    const Function = globalThis.Function
    try {
      globalThis.Function = (() => {
        throw new Error("dynamic function generation unavailable")
      }) as any
      SchemaJITCompiler.enable(schema.ast)
    } finally {
      globalThis.Function = Function
    }

    deepStrictEqual(SchemaParser.decodeUnknownSync(schema)({ value: 1 }), { value: "installed" })
  })
})
