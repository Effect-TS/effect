import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import assert from "node:assert/strict"

const makeDecodeCase = (
  schema,
  input,
  expectedTag,
  expectedResult
) =>
() => {
  assert.equal(schema.ast._tag, expectedTag)
  const run = Schema.decodeUnknownExit(schema)
  return {
    run: () => run(input),
    validate: (result) => assert.equal(result._tag, expectedResult)
  }
}

const uniqueSymbol = Symbol.for("runtimeperf/unique")

export const declarationValid = makeDecodeCase(
  Schema.Option(Schema.String),
  Option.some("value"),
  "Declaration",
  "Success"
)

export const nullValid = makeDecodeCase(Schema.Null, null, "Null", "Success")
export const undefinedValid = makeDecodeCase(Schema.Undefined, undefined, "Undefined", "Success")
export const voidValid = makeDecodeCase(Schema.Void, undefined, "Void", "Success")
export const neverInvalid = makeDecodeCase(Schema.Never, "value", "Never", "Failure")
export const unknownValid = makeDecodeCase(Schema.Unknown, { value: 1 }, "Unknown", "Success")
export const anyValid = makeDecodeCase(Schema.Any, { value: 1 }, "Any", "Success")
export const stringValid = makeDecodeCase(Schema.String, "value", "String", "Success")
export const numberValid = makeDecodeCase(Schema.Number, 1, "Number", "Success")
export const booleanValid = makeDecodeCase(Schema.Boolean, true, "Boolean", "Success")
export const bigintValid = makeDecodeCase(Schema.BigInt, BigInt(1), "BigInt", "Success")
export const symbolValid = makeDecodeCase(Schema.Symbol, Symbol.for("runtimeperf/symbol"), "Symbol", "Success")
export const literalValid = makeDecodeCase(Schema.Literal("value"), "value", "Literal", "Success")
export const uniqueSymbolValid = makeDecodeCase(
  Schema.UniqueSymbol(uniqueSymbol),
  uniqueSymbol,
  "UniqueSymbol",
  "Success"
)
export const objectKeywordValid = makeDecodeCase(Schema.ObjectKeyword, { value: 1 }, "ObjectKeyword", "Success")
export const enumValid = makeDecodeCase(
  Schema.Enum({ Up: "UP", Down: "DOWN" }),
  "UP",
  "Enum",
  "Success"
)
export const templateLiteralValid = makeDecodeCase(
  Schema.TemplateLiteral(["id-", Schema.Number]),
  "id-123",
  "TemplateLiteral",
  "Success"
)
export const arraysValid = makeDecodeCase(
  Schema.Array(Schema.String),
  ["a", "b", "c"],
  "Arrays",
  "Success"
)
export const objectsValid = makeDecodeCase(
  Schema.Struct({ a: Schema.String, b: Schema.Number }),
  { a: "a", b: 1 },
  "Objects",
  "Success"
)
export const unionValid = makeDecodeCase(
  Schema.Union([Schema.String, Schema.Number]),
  1,
  "Union",
  "Success"
)
export const suspendValid = makeDecodeCase(
  Schema.suspend(() => Schema.String),
  "value",
  "Suspend",
  "Success"
)
