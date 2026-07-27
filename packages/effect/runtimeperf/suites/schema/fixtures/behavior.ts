import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as SchemaParser from "effect/SchemaParser"
import * as SchemaTransformation from "effect/SchemaTransformation"
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

const makeEncodingChain = (size) => {
  let schema = Schema.FiniteFromString
  for (let i = 1; i < size; i++) {
    schema = Schema.String.pipe(
      Schema.decodeTo(schema, SchemaTransformation.passthrough())
    )
  }
  return schema
}

const encodingChain8 = makeEncodingChain(8)

export const encodingChain8DecodeValid = decodeParserCase(encodingChain8, "123", true)
export const encodingChain8DecodeInvalid = decodeParserCase(encodingChain8, "invalid", false)
export const encodingChain8EncodeValid = encodeParserCase(encodingChain8, 123, true)

const transformedKeyRecord = Schema.Record(
  Schema.String.pipe(Schema.decode(SchemaTransformation.snakeToCamel())),
  Schema.String
)
const transformedKeyRecordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field_${index}_value`, `value${index}`])
)

export const transformedKeyRecordValid = decodeParserCase(
  transformedKeyRecord,
  transformedKeyRecordInput,
  true
)

const optionalStruct = Schema.Struct({
  required: Schema.String,
  optionalKey: Schema.optionalKey(Schema.String),
  optionalValue: Schema.optional(Schema.String)
})

export const optionalValid = decodeCase(optionalStruct, { required: "value" }, true)

const suspendedString = Schema.String.pipe(Schema.decode({
  decode: new SchemaGetter.Getter((input) => Effect.suspend(() => Effect.succeed(input))),
  encode: SchemaGetter.passthrough()
}))
const suspendedObjectFields = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, index === 16 ? suspendedString : Schema.String])
)
const suspendedObjectInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, `value${index}`])
)

export const object32SuspendedMiddleValid = decodeParserCase(
  Schema.Struct(suspendedObjectFields),
  suspendedObjectInput,
  true
)

const literal2 = Schema.Literals(["value0", "value1"])
const literal100 = Schema.Literals(Array.from({ length: 100 }, (_, index) => `value${index}`))

export const literal2ValidLast = decodeParserCase(literal2, "value1", true)
export const literal100ValidFirst = decodeParserCase(literal100, "value0", true)

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
