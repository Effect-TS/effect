import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"

const decodeCase = (schema, input, success, options) => () => {
  const run = Schema.decodeUnknownExit(schema, options)
  return {
    run: () => run(input),
    validate: (result) => assert.equal(result._tag, success ? "Success" : "Failure")
  }
}

const decodeParserCase = (schema, input, success, options) => () => {
  const run = SchemaParser.decodeUnknownExit(schema, options)
  return {
    run: () => run(input),
    validate: (result) => assert.equal(result._tag, success ? "Success" : "Failure")
  }
}

const encodeParserCase = (schema, input, success, options) => () => {
  const run = SchemaParser.encodeUnknownExit(schema, options)
  return {
    run: () => run(input),
    validate: (result) => assert.equal(result._tag, success ? "Success" : "Failure")
  }
}

const checkedString = Schema.String
  .check(Schema.isMinLength(2))
  .check(Schema.isPattern(/^[a-z]+$/))

export const checksValid = decodeCase(checkedString, "runtimeperf", true)
export const checksInvalidFirst = decodeCase(checkedString, "", false)
export const checksInvalidLast = decodeCase(checkedString, "runtime-perf", false)

export const transformationDecodeValid = decodeParserCase(Schema.FiniteFromString, "123", true)
export const transformationDecodeInvalid = decodeParserCase(Schema.FiniteFromString, "invalid", false)
export const transformationEncodeValid = encodeParserCase(Schema.FiniteFromString, 123, true)

const optionalStruct = Schema.Struct({
  required: Schema.String,
  optionalKey: Schema.optionalKey(Schema.String),
  optionalValue: Schema.optional(Schema.String)
})

export const optionalValid = decodeCase(optionalStruct, { required: "value" }, true)

const errorFields = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => [`field${index}`, Schema.String])
)
const errorsAllSchema = Schema.Struct(errorFields)
const errorsAllInput = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => [`field${index}`, index])
)

export const errorsFirst = decodeCase(errorsAllSchema, errorsAllInput, false)
export const errorsAll = decodeCase(errorsAllSchema, errorsAllInput, false, { errors: "all" })

const propertyOrderSchema = Schema.Struct({
  a: Schema.String,
  b: Schema.String
})
const propertyOrderInput = { extra: "extra", b: "b", a: "a" }

export const propertyOrderOriginal = decodeCase(
  propertyOrderSchema,
  propertyOrderInput,
  true,
  { onExcessProperty: "preserve", propertyOrder: "original" }
)

const recursiveTree = Schema.Struct({
  value: Schema.String,
  children: Schema.Array(Schema.suspend(() => recursiveTree))
})

const makeTree = (depth) =>
  depth === 0
    ? { value: "leaf", children: [] }
    : { value: `node${depth}`, children: [makeTree(depth - 1)] }

export const recursiveTreeDepth16Valid = decodeCase(recursiveTree, makeTree(16), true)
