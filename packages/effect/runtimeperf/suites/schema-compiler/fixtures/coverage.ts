import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import * as SchemaTransformation from "effect/SchemaTransformation"
import assert from "node:assert/strict"

const validCase = (schema, input, expected = input) => () => {
  const decode = SchemaParser.decodeUnknownSync(schema)
  return {
    run: () => decode(input),
    validate: (result) => assert.deepEqual(result, expected)
  }
}

const invalidCase = (schema, input) => () => {
  const decode = SchemaParser.decodeUnknownSync(schema)
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

export const array100Valid = validCase(array100, array100Input)
export const array100InvalidLast = invalidCase(array100, array100Invalid)

const tupleRest = Schema.TupleWithRest(
  Schema.Tuple([Schema.String]),
  [Schema.Number, Schema.Boolean]
)
const tupleRestInput = ["head", ...Array.from({ length: 32 }, (_, index) => index), true]

export const tupleRestValid = validCase(tupleRest, tupleRestInput)

const optionalFields = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, Schema.optionalKey(Schema.String)])
)
const optionalStruct = Schema.Struct(optionalFields)
const optionalStructInput = Object.fromEntries(
  Array.from({ length: 16 }, (_, index) => [`field${index * 2}`, `value${index}`])
)

export const optionalStructValid = validCase(optionalStruct, optionalStructInput)

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

export const recordValid = validCase(record, recordInput)

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

export const templateRecordValid = validCase(templateRecord, templateRecordInput, templateRecordOutput)

const structWithRecord = Schema.StructWithRest(
  Schema.Struct(
    Object.fromEntries(Array.from({ length: 16 }, (_, index) => [`field${index}`, Schema.Number]))
  ),
  [Schema.Record(Schema.String, Schema.Number)]
)
const structWithRecordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, index])
)

export const structWithRecordValid = validCase(structWithRecord, structWithRecordInput)

const numberRecord = Schema.Record(Schema.Number, Schema.Number)
const numberRecordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [String(index), index])
)

export const numberRecordValid = validCase(numberRecord, numberRecordInput)

const transformedKeyRecord = Schema.Record(
  Schema.String.pipe(Schema.decodeTo(Schema.String, SchemaTransformation.toUpperCase())),
  Schema.Number
)
const transformedKeyRecordInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, index])
)
const transformedKeyRecordOutput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`FIELD${index}`, index])
)

export const transformedKeyRecordValid = validCase(
  transformedKeyRecord,
  transformedKeyRecordInput,
  transformedKeyRecordOutput
)

const encodingCheckedStruct = Schema.Struct(
  Object.fromEntries(Array.from({ length: 32 }, (_, index) => [`field${index}`, Schema.String]))
).pipe(
  Schema.flip,
  Schema.check(Schema.makeFilter((input) => input.field0.length > 0)),
  Schema.flip
)
const encodingCheckedStructInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, `value${index}`])
)

export const encodingCheckedStructValid = validCase(encodingCheckedStruct, encodingCheckedStructInput)

const literal100 = Schema.Literals(Array.from({ length: 100 }, (_, index) => `value${index}`))

export const literal100ValidLast = validCase(literal100, "value99")
export const literal100Invalid = invalidCase(literal100, "missing")

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

export const taggedUnion100ValidLast = validCase(taggedUnion100, taggedUnion100Input, taggedUnion100Output)
export const taggedUnion100Invalid = invalidCase(
  taggedUnion100,
  { kind: "missing", text: "value", count: 99 }
)

const checkedString = Schema.String.check(Schema.isMinLength(2))

export const checkedStringValid = validCase(checkedString, "value")

const templateLiteral = Schema.TemplateLiteral(["prefix-", Schema.String])

export const templateLiteralValid = validCase(templateLiteral, "prefix-value")

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
  transformationStructOutput
)

export const transformationRootValid = validCase(Schema.FiniteFromString, "123", 123)
export const transformationRootInvalid = invalidCase(Schema.FiniteFromString, "invalid")
export const transformationUpperCaseValid = validCase(
  Schema.String.pipe(Schema.decodeTo(Schema.String, SchemaTransformation.toUpperCase())),
  "value",
  "VALUE"
)

const transformationOutputInvalidSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String.check(Schema.isMinLength(2)),
    SchemaTransformation.transform({
      decode: () => "",
      encode: (value) => value
    })
  )
)

export const transformationOutputInvalid = invalidCase(transformationOutputInvalidSchema, "valid input")

const middlewareStruct = Schema.Struct(
  Object.fromEntries(Array.from({ length: 32 }, (_, index) => [`field${index}`, Schema.String]))
).pipe(
  Schema.middlewareDecoding((effect) => Effect.map(effect, (value) => value))
)
const middlewareStructInput = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => [`field${index}`, `value${index}`])
)

export const middlewareStructValid = validCase(middlewareStruct, middlewareStructInput)

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

export const recursiveNodeValid = validCase(recursiveNode, recursiveNodeInput)
