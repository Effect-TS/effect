import { assert, describe, it } from "@effect/vitest"
import { Cause, Schema, SchemaCompiler, SchemaParser } from "effect"
import { assertSchemaIssueError, deepStrictEqual, strictEqual, throws } from "../utils/assert.ts"

const schema = Schema.Struct({
  name: Schema.String,
  count: Schema.Number,
  active: Schema.Boolean,
  nested: Schema.Struct({ value: Schema.String })
})

const decodeCreatedBeforeEnable = SchemaParser.decodeUnknownSync(schema)

SchemaCompiler.enable()

describe("SchemaCompiler", () => {
  it("compiles a decoder lazily after enable", () => {
    const input = {
      name: "a",
      count: 1,
      active: true,
      nested: { value: "b", extra: true },
      extra: true
    }
    const output = decodeCreatedBeforeEnable(input)

    deepStrictEqual(output, {
      name: "a",
      count: 1,
      active: true,
      nested: { value: "b" }
    })
    assert.notStrictEqual(output, input)
    assert.notStrictEqual(output.nested, input.nested)
  })

  it("replays the interpreter to construct an issue", () => {
    let reads = 0
    const input = {
      get name() {
        reads++
        return 1
      },
      count: 1,
      active: true,
      nested: { value: "b" }
    }

    throws(() => decodeCreatedBeforeEnable(input), (error) => {
      assertSchemaIssueError(error, `Expected string\n  at ["name"]`)
    })
    strictEqual(reads, 2)
  })

  it("does not replay defects", () => {
    const defect = new Error("boom")
    let reads = 0
    const input = {
      get name(): string {
        reads++
        throw defect
      },
      count: 1,
      active: true,
      nested: { value: "b" }
    }

    throws(() => decodeCreatedBeforeEnable(input), (error) => {
      assert(error instanceof Error)
      strictEqual(error.message, "Sync adapter can only throw schema issues")
      assert(Cause.hasDies(error.cause as Cause.Cause<never>))
    })
    strictEqual(reads, 1)
  })

  it("uses the interpreter for explicit ParseOptions", () => {
    assert.deepStrictEqual(
      decodeCreatedBeforeEnable(
        {
          name: "a",
          count: 1,
          active: true,
          nested: { value: "b", nestedExtra: true },
          extra: true
        },
        { onExcessProperty: "preserve" }
      ),
      {
        name: "a",
        count: 1,
        active: true,
        nested: { value: "b", nestedExtra: true },
        extra: true
      } as any
    )
  })

  it("preserves own-property semantics for custom prototypes", () => {
    let reads = 0
    const prototype = { name: "inherited" }
    const input = Object.assign(Object.create(prototype), {
      count: 1,
      active: true,
      nested: { value: "b" }
    })
    Object.defineProperty(input, "name", {
      configurable: true,
      enumerable: true,
      get() {
        reads++
        return "own"
      }
    })

    deepStrictEqual(decodeCreatedBeforeEnable(input), {
      name: "own",
      count: 1,
      active: true,
      nested: { value: "b" }
    })
    strictEqual(reads, 1)

    delete input.name
    throws(() => decodeCreatedBeforeEnable(input), (error) => {
      assertSchemaIssueError(error, `Missing key\n  at ["name"]`)
    })
  })

  it("uses the interpreter for unsupported schemas", () => {
    const decode = SchemaParser.decodeUnknownSync(Schema.NumberFromString)
    strictEqual(decode("1"), 1)
  })

  it("compiles primitive leaves without confusing undefined with a missing key", () => {
    const decode = SchemaParser.decodeUnknownSync(Schema.Struct({
      undefined: Schema.Undefined,
      unknown: Schema.Unknown,
      bigint: Schema.BigInt,
      symbol: Schema.Symbol,
      literal: Schema.Literal("a")
    }))
    const symbol = globalThis.Symbol("a")

    deepStrictEqual(
      decode({ undefined, unknown: undefined, bigint: 1n, symbol, literal: "a", extra: true }),
      { undefined, unknown: undefined, bigint: 1n, symbol, literal: "a" }
    )
    throws(() => decode({ unknown: undefined, bigint: 1n, symbol, literal: "a" }), (error) => {
      assertSchemaIssueError(error, `Missing key\n  at ["undefined"]`)
    })
  })

  it("compiles arrays and tuples with rest and tail elements", () => {
    const decodeArray = SchemaParser.decodeUnknownSync(Schema.Array(Schema.String))
    deepStrictEqual(decodeArray(["a", "b"]), ["a", "b"])

    const decodeTuple = SchemaParser.decodeUnknownSync(
      Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.Boolean])
    )
    deepStrictEqual(decodeTuple(["a", 1, 2, true]), ["a", 1, 2, true])
    throws(() => decodeTuple(["a", 1, 2]), (error) => {
      assertSchemaIssueError(error, `Expected boolean\n  at [2]`)
    })
  })

  it("compiles primitive anyOf and oneOf unions", () => {
    const decodeAnyOf = SchemaParser.decodeUnknownSync(
      Schema.Union([Schema.Literal("a"), Schema.Literal("b"), Schema.Number])
    )
    strictEqual(decodeAnyOf("b"), "b")
    strictEqual(decodeAnyOf(1), 1)
    throws(() => decodeAnyOf(true), (error) => {
      assertSchemaIssueError(error, "Expected \"a\" | \"b\" | number")
    })

    const decodeOneOf = SchemaParser.decodeUnknownSync(
      Schema.Union([Schema.String, Schema.Literal("a")], { mode: "oneOf" })
    )
    strictEqual(decodeOneOf("b"), "b")
    throws(() => decodeOneOf("a"), (error) => {
      assertSchemaIssueError(error, "Expected exactly one member to match")
    })
  })

  it("compiles optional object properties", () => {
    const decode = SchemaParser.decodeUnknownSync(Schema.Struct({
      required: Schema.String,
      optional: Schema.optionalKey(Schema.Number),
      undefined: Schema.optionalKey(Schema.Undefined)
    }))

    deepStrictEqual(decode({ required: "a" }), { required: "a" })
    deepStrictEqual(
      decode({ required: "a", optional: 1, undefined, extra: true }),
      { required: "a", optional: 1, undefined }
    )
    throws(() => decode({ required: "a", optional: "invalid" }), (error) => {
      assertSchemaIssueError(error, `Expected number\n  at ["optional"]`)
    })
  })

  it("compiles string records", () => {
    const decode = SchemaParser.decodeUnknownSync(
      Schema.Record(Schema.String, Schema.Struct({ count: Schema.Number }))
    )
    deepStrictEqual(
      decode({ a: { count: 1 }, b: { count: 2 }, extra: { count: 3, ignored: true } }),
      { a: { count: 1 }, b: { count: 2 }, extra: { count: 3 } }
    )
    throws(() => decode({ a: { count: "invalid" } }), (error) => {
      assertSchemaIssueError(error, `Expected number\n  at ["a"]["count"]`)
    })
  })

  it("runs checks against decoded output", () => {
    const decodeString = SchemaParser.decodeUnknownSync(
      Schema.String.check(Schema.isMinLength(2))
    )
    strictEqual(decodeString("ab"), "ab")
    throws(() => decodeString("a"), (error) => {
      assertSchemaIssueError(error, "Expected a value with a length of at least 2")
    })

    const decodeObject = SchemaParser.decodeUnknownSync(
      Schema.Struct({ value: Schema.String }).check(Schema.isMaxProperties(1))
    )
    deepStrictEqual(decodeObject({ value: "a", extra: true }), { value: "a" })
  })
})
