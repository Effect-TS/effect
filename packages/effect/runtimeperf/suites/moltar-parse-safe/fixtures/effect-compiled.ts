import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
// oxlint-disable-next-line no-unassigned-import
import "effect/unstable/schema/SchemaCompiler"
import assert from "node:assert/strict"
import { invalidData, validData, validDataWithExtras } from "./data.ts"

const makeSchema = () =>
  Schema.Struct({
    number: Schema.Number,
    negNumber: Schema.Number,
    maxNumber: Schema.Number,
    string: Schema.String,
    longString: Schema.String,
    boolean: Schema.Boolean,
    deeplyNested: Schema.Struct({
      foo: Schema.String,
      num: Schema.Number,
      bool: Schema.Boolean
    })
  })

const parseCase = (input: unknown) => () => {
  const parse = SchemaParser.decodeUnknownSync(makeSchema())
  return {
    run: () => parse(input),
    validate: (result: unknown) => assert.deepEqual(result, validData)
  }
}

export const parseSafeValid = parseCase(validData)
export const parseSafeExtraValid = parseCase(validDataWithExtras)

export const parseSafeInvalid = () => {
  const parse = SchemaParser.decodeUnknownSync(makeSchema())
  return {
    run: () => {
      try {
        parse(invalidData)
        return false
      } catch {
        return true
      }
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

export const initializationSchema = () => ({
  run: () => SchemaParser.decodeUnknownSync(makeSchema())(validData),
  validate: (result: unknown) => assert.deepEqual(result, validData)
})
