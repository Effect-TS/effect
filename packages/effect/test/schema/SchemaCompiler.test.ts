import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Result, Schema, SchemaGetter, SchemaIssue, SchemaParser, SchemaTransformation } from "effect"
import { SchemaCompiler } from "effect/unstable/schema"
import { assertSchemaIssueError, deepStrictEqual, strictEqual, throws } from "../utils/assert.ts"

const schema = Schema.Struct({
  name: Schema.String,
  count: Schema.Number,
  active: Schema.Boolean,
  nested: Schema.Struct({ value: Schema.String })
})

const decodeCreatedBeforeEnable = SchemaParser.decodeUnknownSync(schema)
const isCreatedBeforeEnable = SchemaParser.is(schema)

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

  it("reuses the compiled decoder for type guards", () => {
    strictEqual(
      isCreatedBeforeEnable({
        name: "a",
        count: 1,
        active: true,
        nested: { value: "b" }
      }),
      true
    )
    strictEqual(
      isCreatedBeforeEnable({
        name: 1,
        count: 1,
        active: true,
        nested: { value: "b" }
      }),
      false
    )

    const defect = new Error("boom")
    let reads = 0
    throws(() =>
      isCreatedBeforeEnable({
        get name(): string {
          reads++
          throw defect
        },
        count: 1,
        active: true,
        nested: { value: "b" }
      }), (error) => {
      assert(error instanceof Error)
      strictEqual(error.message, "Type guard adapter can only return false for schema issues")
      assert(Cause.hasDies(error.cause as Cause.Cause<never>))
    })
    strictEqual(reads, 1)
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

  it("compiles symbol-keyed Struct properties", () => {
    const key = Symbol("key")
    const decode = SchemaParser.decodeUnknownSync(Schema.Struct({
      text: Schema.String,
      [key]: Schema.Number
    }))
    const output = decode({ text: "value", [key]: 1, extra: true })

    strictEqual(output.text, "value")
    strictEqual(output[key], 1)
    deepStrictEqual(Reflect.ownKeys(output), ["text", key])
  })

  it("uses the interpreter for unsupported schemas", () => {
    const date = new Date(0)
    const decode = SchemaParser.decodeUnknownSync(Schema.instanceOf(Date))
    strictEqual(decode(date), date)
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

  it("compiles structural unions through canonical candidate selection", () => {
    const decodeTagged = SchemaParser.decodeUnknownSync(Schema.Union([
      Schema.Struct({ kind: Schema.Literal("a"), value: Schema.String }),
      Schema.Struct({ kind: Schema.Literal("b"), value: Schema.Number })
    ]))
    deepStrictEqual(
      decodeTagged({ kind: "b", value: 1, extra: true }),
      { kind: "b", value: 1 }
    )

    const decodeUntagged = SchemaParser.decodeUnknownSync(Schema.Union([
      Schema.Struct({ first: Schema.String }),
      Schema.Struct({ second: Schema.String })
    ]))
    deepStrictEqual(
      decodeUntagged({ first: "a", second: "b" }),
      { first: "a" }
    )

    const decodeOneOf = SchemaParser.decodeUnknownSync(Schema.Union([
      Schema.Struct({ first: Schema.String }),
      Schema.Struct({ second: Schema.String })
    ], { mode: "oneOf" }))
    throws(() => decodeOneOf({ first: "a", second: "b" }), (error) => {
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

  it("compiles symbol and template-literal records", () => {
    const symbol = Symbol("key")
    const decodeSymbols = SchemaParser.decodeUnknownSync(Schema.Record(Schema.Symbol, Schema.Number))
    const symbolOutput = decodeSymbols({ text: "ignored", [symbol]: 1 })
    strictEqual(symbolOutput[symbol], 1)
    deepStrictEqual(Reflect.ownKeys(symbolOutput), [symbol])

    const decodeTemplates = SchemaParser.decodeUnknownSync(
      Schema.Record(Schema.TemplateLiteral(["data-", Schema.String]), Schema.Number)
    )
    deepStrictEqual(
      decodeTemplates({ "data-a": 1, ignored: 2, "data-b": 3 }),
      { "data-a": 1, "data-b": 3 }
    )
  })

  it("compiles fixed properties with index signatures", () => {
    const decode = SchemaParser.decodeUnknownSync(
      Schema.StructWithRest(
        Schema.Struct({ fixed: Schema.Trim }),
        [Schema.Record(Schema.String, Schema.String)]
      )
    )
    deepStrictEqual(decode({ fixed: "  value  ", other: "other" }), { fixed: "value", other: "other" })
  })

  it("compiles decoded index keys", () => {
    const decodeNumbers = SchemaParser.decodeUnknownSync(Schema.Record(Schema.Number, Schema.Number))
    deepStrictEqual(decodeNumbers({ 1: 1, other: "ignored" }), { 1: 1 })

    const decodeCamelCase = SchemaParser.decodeUnknownSync(
      Schema.Record(
        Schema.String.pipe(Schema.decodeTo(Schema.String, SchemaTransformation.toUpperCase())),
        Schema.Number
      )
    )
    deepStrictEqual(decodeCamelCase({ a: 1, b: 2 }), { A: 1, B: 2 })
  })

  it("compiles encoding checks", () => {
    const checked = Schema.Struct({ value: Schema.String }).pipe(
      Schema.flip,
      Schema.check(Schema.makeFilter((input) => input.value.length > 1)),
      Schema.flip
    )
    const decode = SchemaParser.decodeUnknownSync(checked)
    deepStrictEqual(decode({ value: "valid" }), { value: "valid" })
    throws(() => decode({ value: "" }))
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

  it("embeds synchronous Declaration and transformation runtime islands", () => {
    const date = new Date(0)
    const decode = SchemaParser.decodeUnknownSync(Schema.Struct({
      date: Schema.instanceOf(Date),
      count: Schema.FiniteFromString
    }))

    const output = decode({ date, count: "1", extra: true })
    strictEqual(output.date, date)
    strictEqual(output.count, 1)
    deepStrictEqual(Reflect.ownKeys(output), ["date", "count"])
  })

  it("compiles root encoding chains", () => {
    const decodeNumber = SchemaParser.decodeUnknownSync(Schema.FiniteFromString)
    strictEqual(decodeNumber("1"), 1)
    throws(() => decodeNumber("invalid"), (error) => {
      assertSchemaIssueError(error, "Expected a finite number")
    })

    const decodeJson = SchemaParser.decodeUnknownSync(
      Schema.fromJsonString(Schema.Struct({ value: Schema.Number }))
    )
    deepStrictEqual(decodeJson("{\"value\":1,\"extra\":true}"), { value: 1 })
  })

  it("preserves mixed causes from compiled encoding chains", () => {
    const cause = Cause.combine(
      Cause.fail(new SchemaIssue.InvalidValue({ message: "schema issue" })),
      Cause.die(new Error("defect"))
    )
    const schema = Schema.String.pipe(Schema.decode({
      decode: new SchemaGetter.Getter(() => Effect.failCause(cause)),
      encode: SchemaGetter.passthrough()
    }))

    throws(() => SchemaParser.decodeUnknownSync(schema)("value"), (error) => {
      assert(error instanceof Error)
      strictEqual(error.message, "Sync adapter can only throw schema issues")
      const issue = Cause.findError(error.cause as Cause.Cause<SchemaIssue.Issue>)
      assert(Result.isSuccess(issue))
      strictEqual(issue.success._tag, "Encoding")
      assert(Cause.hasDies(error.cause as Cause.Cause<never>))
    })
  })

  it("keeps Suspend runtime islands lazy", () => {
    interface Category {
      readonly value: string
      readonly children: ReadonlyArray<Category>
    }
    let evaluations = 0
    const schema: Schema.Codec<Category> = Schema.Struct({
      value: Schema.String,
      children: Schema.Array(Schema.suspend((): Schema.Codec<Category> => {
        evaluations++
        return schema
      }))
    })
    const decode = SchemaParser.decodeUnknownSync(schema)

    deepStrictEqual(decode({ value: "root", children: [] }), { value: "root", children: [] })
    strictEqual(evaluations, 0)
    deepStrictEqual(
      decode({ value: "root", children: [{ value: "child", children: [] }] }),
      { value: "root", children: [{ value: "child", children: [] }] }
    )
    strictEqual(evaluations, 1)
  })

  it("does not replay defects from runtime islands", () => {
    const defect = new Error("declaration defect")
    let runs = 0
    const declaration = Schema.declareConstructor<unknown>()([], () => () => {
      runs++
      return Effect.die(defect)
    })
    const decode = SchemaParser.decodeUnknownSync(Schema.Struct({ declaration }))

    throws(() => decode({ declaration: "value" }), (error) => {
      assert(error instanceof Error)
      strictEqual(error.message, "Sync adapter can only throw schema issues")
      assert(Cause.hasDies(error.cause as Cause.Cause<never>))
    })
    strictEqual(runs, 1)
  })
})
