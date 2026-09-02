import * as Schema from "effect/Schema"
import * as SchemaCompiler from "effect/SchemaCompiler"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"

const validCase = (schema, input, compiled, expected = input) => () => {
  const decode = SchemaParser.decodeUnknownSync(schema)
  if (compiled) SchemaCompiler.enable()
  return {
    run: () => decode(input),
    validate: (result) => assert.deepEqual(result, expected)
  }
}

const invalidCase = (schema, input, compiled) => () => {
  const decode = SchemaParser.decodeUnknownSync(schema)
  if (compiled) SchemaCompiler.enable()
  return {
    run: () => {
      try {
        decode(input)
        return false
      } catch {
        return true
      }
    },
    validate: (result) => assert.equal(result, true)
  }
}

const array100 = Schema.Array(Schema.String)
const array100Input = Array.from({ length: 100 }, (_, index) => `value${index}`)
const array100Invalid = [...array100Input.slice(0, -1), 99]

export const array100Valid = validCase(array100, array100Input, false)
export const array100ValidCompiled = validCase(array100, array100Input, true)
export const array100InvalidLast = invalidCase(array100, array100Invalid, false)
export const array100InvalidLastCompiled = invalidCase(array100, array100Invalid, true)

const tupleRest = Schema.TupleWithRest(
  Schema.Tuple([Schema.String]),
  [Schema.Number, Schema.Boolean]
)
const tupleRestInput = ["head", ...Array.from({ length: 32 }, (_, index) => index), true]

export const tupleRestValid = validCase(tupleRest, tupleRestInput, false)
export const tupleRestValidCompiled = validCase(tupleRest, tupleRestInput, true)

const optionalFields = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, Schema.optionalKey(Schema.String)])
)
const optionalStruct = Schema.Struct(optionalFields)
const optionalStructInput = Object.fromEntries(
  Array.from({ length: 16 }, (_, index) => [`field${index * 2}`, `value${index}`])
)

export const optionalStructValid = validCase(optionalStruct, optionalStructInput, false)
export const optionalStructValidCompiled = validCase(optionalStruct, optionalStructInput, true)

const record = Schema.Record(
  Schema.String,
  Schema.Struct({ text: Schema.String, count: Schema.Number, active: Schema.Boolean })
)
const recordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [
    `entry${index}`,
    { text: `value${index}`, count: index, active: index % 2 === 0 }
  ])
)

export const recordValid = validCase(record, recordInput, false)
export const recordValidCompiled = validCase(record, recordInput, true)

const templateRecord = Schema.Record(
  Schema.TemplateLiteral(["data-", Schema.String]),
  Schema.Number
)
const templateRecordInput = Object.fromEntries(
  Array.from({ length: 64 }, (_, index) => [
    index % 2 === 0 ? `data-${index}` : `ignored-${index}`,
    index
  ])
)
const templateRecordOutput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`data-${index * 2}`, index * 2])
)

export const templateRecordValid = validCase(templateRecord, templateRecordInput, false, templateRecordOutput)
export const templateRecordValidCompiled = validCase(templateRecord, templateRecordInput, true, templateRecordOutput)

const structWithRecord = Schema.StructWithRest(
  Schema.Struct(
    Object.fromEntries(Array.from({ length: 16 }, (_, index) => [`field${index}`, Schema.Number]))
  ),
  [Schema.Record(Schema.String, Schema.Number)]
)
const structWithRecordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, index])
)

export const structWithRecordValid = validCase(structWithRecord, structWithRecordInput, false)
export const structWithRecordValidCompiled = validCase(structWithRecord, structWithRecordInput, true)

const literal100 = Schema.Literals(Array.from({ length: 100 }, (_, index) => `value${index}`))

export const literal100ValidLast = validCase(literal100, "value99", false)
export const literal100ValidLastCompiled = validCase(literal100, "value99", true)
export const literal100Invalid = invalidCase(literal100, "missing", false)
export const literal100InvalidCompiled = invalidCase(literal100, "missing", true)

const taggedUnion100 = Schema.Union(
  Array.from({ length: 100 }, (_, index) =>
    Schema.Struct({
      kind: Schema.Literal(`value${index}`),
      text: Schema.String,
      count: Schema.Number
    }))
)
const taggedUnion100Input = { kind: "value99", text: "value", count: 99, extra: true }
const taggedUnion100Output = { kind: "value99", text: "value", count: 99 }

export const taggedUnion100ValidLast = validCase(taggedUnion100, taggedUnion100Input, false, taggedUnion100Output)
export const taggedUnion100ValidLastCompiled = validCase(
  taggedUnion100,
  taggedUnion100Input,
  true,
  taggedUnion100Output
)
export const taggedUnion100Invalid = invalidCase(
  taggedUnion100,
  { kind: "missing", text: "value", count: 99 },
  false
)
export const taggedUnion100InvalidCompiled = invalidCase(
  taggedUnion100,
  { kind: "missing", text: "value", count: 99 },
  true
)

const checkedString = Schema.String.check(Schema.isMinLength(2))

export const checkedStringValid = validCase(checkedString, "value", false)
export const checkedStringValidCompiled = validCase(checkedString, "value", true)

const templateLiteral = Schema.TemplateLiteral(["prefix-", Schema.String])

export const templateLiteralValid = validCase(templateLiteral, "prefix-value", false)
export const templateLiteralValidCompiled = validCase(templateLiteral, "prefix-value", true)

const transformationFields = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, Schema.FiniteFromString])
)
const transformationStruct = Schema.Struct(transformationFields)
const transformationStructInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, String(index)])
)
const transformationStructOutput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, index])
)

export const transformationStructValid = validCase(
  transformationStruct,
  transformationStructInput,
  false,
  transformationStructOutput
)
export const transformationStructValidCompiled = validCase(
  transformationStruct,
  transformationStructInput,
  true,
  transformationStructOutput
)

export const transformationRootValid = validCase(Schema.FiniteFromString, "123", false, 123)
export const transformationRootValidCompiled = validCase(Schema.FiniteFromString, "123", true, 123)
export const transformationRootInvalid = invalidCase(Schema.FiniteFromString, "invalid", false)
export const transformationRootInvalidCompiled = invalidCase(Schema.FiniteFromString, "invalid", true)

interface RecursiveNode {
  readonly value: string
  readonly children: ReadonlyArray<RecursiveNode>
}

const recursiveNode: Schema.Codec<RecursiveNode> = Schema.Struct({
  value: Schema.String,
  children: Schema.Array(Schema.suspend((): Schema.Codec<RecursiveNode> => recursiveNode))
})
const makeRecursiveNode = (depth: number): RecursiveNode => ({
  value: `depth${depth}`,
  children: depth === 0 ? [] : Array.from({ length: 3 }, () => makeRecursiveNode(depth - 1))
})
const recursiveNodeInput = makeRecursiveNode(4)

export const recursiveNodeValid = validCase(recursiveNode, recursiveNodeInput, false)
export const recursiveNodeValidCompiled = validCase(recursiveNode, recursiveNodeInput, true)
