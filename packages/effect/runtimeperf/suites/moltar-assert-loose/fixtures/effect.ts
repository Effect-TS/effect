import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"
import { invalidData, validData, validDataWithExtras } from "./data.ts"

// Adapted to the Effect 4 boolean guard API from the @effect/schema adapter in
// moltar/typescript-runtime-type-benchmarks at d1791e68fc1108ef47da50547e80900e177a9d10.
// Upstream license: MIT, declared in package.json at that commit.
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

const assertionCase = (input: unknown) => () => {
  const run = SchemaParser.is(makeSchema())
  return {
    run: () => {
      if (!run(input)) throw new Error("Invalid")
      return true
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

export const assertLooseValid = assertionCase(validData)
export const assertLooseExtraValid = assertionCase(validDataWithExtras)

export const assertLooseInvalid = () => {
  const run = SchemaParser.is(makeSchema())
  return {
    run: () => run(invalidData),
    validate: (result: unknown) => assert.equal(result, false)
  }
}

export const initializationSchema = () => ({
  run: () => SchemaParser.is(makeSchema())(validData),
  validate: (result: unknown) => assert.equal(result, true)
})
