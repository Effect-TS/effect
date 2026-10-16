import { assert, describe, it } from "@effect/vitest"
import {
  Effect,
  Result,
  Schema,
  SchemaAST,
  SchemaGetter,
  SchemaIssue,
  SchemaParser,
  SchemaTransformation
} from "effect"
import * as Codegen from "effect/internal/schema/codegen"
import { SchemaJITCompiler } from "effect/schema"
import { deepStrictEqual } from "../utils/assert.ts"

type Options = Parameters<ReturnType<typeof SchemaParser.decodeUnknownResult>>[1]

const optionSets: ReadonlyArray<Options> = [
  undefined,
  { errors: "all" },
  { onExcessProperty: "error" },
  { errors: "all", onExcessProperty: "error" }
]

const formatIssue = SchemaIssue.makeFormatterDefault()

const toNumber = SchemaTransformation.transform({ decode: Number, encode: String })

// Every case builds its own schema: the compiler registry is global, so an
// AST enabled by an earlier case would make a later interpreted snapshot use
// compiled children.
const cases: ReadonlyArray<{
  readonly name: string
  readonly schema: () => Schema.Codec<unknown, unknown>
  readonly inputs: ReadonlyArray<unknown>
}> = [
  {
    name: "Number, Boolean and String",
    schema: () =>
      Schema.toCodecStringTree(Schema.Struct({ id: Schema.Number, ok: Schema.Boolean, name: Schema.String })),
    inputs: [
      { id: "1", ok: "true", name: "a" },
      { id: "-1.5", ok: "false", name: "" },
      { id: "NaN", ok: "true", name: "a" },
      { id: "Infinity", ok: "true", name: "a" },
      { id: "1", ok: "true", name: "a", extra: "x" },
      { id: "x", ok: "true", name: "a" },
      { id: "x", ok: "yes", name: 1 },
      { id: 1, ok: true, name: "a" },
      { ok: "true" },
      {},
      null,
      [],
      "row"
    ]
  },
  {
    name: "Finite, literal unions and optional properties",
    schema: () =>
      Schema.toCodecStringTree(Schema.Struct({
        n: Schema.Finite,
        kind: Schema.Literals(["a", 1, true]),
        opt: Schema.optional(Schema.Number),
        key: Schema.optionalKey(Schema.Boolean)
      })),
    inputs: [
      { n: "1", kind: "a" },
      { n: "1", kind: "1", opt: "2", key: "false" },
      { n: "1", kind: "true", opt: undefined },
      { n: "Infinity", kind: "a" },
      { n: "1", kind: "b" },
      { n: "1", kind: "a", opt: "x", key: "x" },
      { n: "1", kind: "a", key: undefined },
      { n: "x", kind: 2, opt: 1, key: true, extra: 1 },
      { kind: "a" }
    ]
  },
  {
    name: "encodeKeys renames",
    schema: () =>
      Schema.toCodecStringTree(
        Schema.Struct({ id: Schema.Number, ok: Schema.Boolean }).pipe(Schema.encodeKeys({ id: "ID" }))
      ),
    inputs: [
      { ID: "1", ok: "true" },
      { id: "1", ok: "true" },
      { ID: "x", ok: "x" },
      { ID: "1", ok: "true", id: "2" }
    ]
  },
  {
    name: "__proto__ property",
    schema: () => Schema.toCodecStringTree(Schema.Struct({ ["__proto__"]: Schema.Number, ok: Schema.Boolean })),
    inputs: [
      JSON.parse(`{"__proto__":"1","ok":"true"}`),
      JSON.parse(`{"__proto__":"x","ok":"true"}`),
      JSON.parse(`{"ok":"true"}`),
      { ok: "true" }
    ]
  }
]

const snapshot = (schema: Schema.Codec<unknown, unknown>, inputs: ReadonlyArray<unknown>) => {
  const decode = SchemaParser.decodeUnknownResult(schema)
  const is = SchemaParser.is(schema)
  return optionSets.flatMap((options) =>
    inputs.map((input) => {
      const result = decode(input, options)
      return Result.isSuccess(result)
        ? { success: result.success, keys: Reflect.ownKeys(result.success as object), is: is(result.success) }
        : { failure: formatIssue(result.failure), is: is(input) }
    })
  )
}

describe("SchemaJITCompiler: inlinable property encodings", () => {
  it("generates a synchronous decoder for StringTree codec structs", () => {
    const schemas = [
      Schema.Struct({ id: Schema.Number, ok: Schema.Boolean, name: Schema.String }),
      Schema.Struct({
        name: Schema.String,
        id: Schema.Number,
        ok: Schema.Boolean,
        score: Schema.optionalKey(Schema.Number)
      })
    ]
    for (const schema of schemas) {
      const codec = Schema.toCodecStringTree(schema)
      assert.isDefined(Codegen.generate(codec.ast, "decode"))
      // Property encodings are not part of the type side.
      assert.isUndefined(Codegen.generate(codec.ast, "is"))
    }
  })

  for (const testCase of cases) {
    it(`matches the interpreter: ${testCase.name}`, () => {
      const schema = testCase.schema()
      const interpreted = snapshot(schema, testCase.inputs)
      SchemaJITCompiler.enable(schema.ast)
      SchemaJITCompiler.enable(SchemaAST.toType(schema.ast))
      deepStrictEqual(snapshot(schema, testCase.inputs), interpreted)
    })
  }

  it("does not generate a synchronous decoder for encodings that cannot be inlined", () => {
    const id = Schema.toCodecStringTree(Schema.Number)
    assert.isDefined(Codegen.generate(Schema.Struct({ id }).ast, "decode"))
    const fields: ReadonlyArray<Schema.Top> = [
      // Checks between two transformations.
      Schema.String.pipe(
        Schema.decodeTo(Schema.String.check(Schema.isMinLength(1))),
        Schema.decodeTo(Schema.Number, toNumber)
      ),
      Schema.String.pipe(Schema.decodeTo(Schema.Number, {
        decode: SchemaGetter.transformEffect((s: string) => Effect.succeed(Number(s))),
        encode: SchemaGetter.transform(String)
      })),
      Schema.Date,
      Schema.suspend(() => Schema.String)
    ]
    for (const field of fields) {
      assert.isUndefined(Codegen.generate(Schema.Struct({ id, field }).ast, "decode"))
    }
  })
})
