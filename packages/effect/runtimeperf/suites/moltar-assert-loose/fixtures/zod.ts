import assert from "node:assert/strict"
import * as z from "zod/v4"
import { invalidData, validData, validDataWithExtras } from "./data.ts"

// The parse and compiled cases reproduce the adapters proposed in
// moltar/typescript-runtime-type-benchmarks#2329 at
// 34ebbad559318a8b5cc60fb92204db4c162fce50. The uncompiled validate cases
// isolate z.validate from z.compile, while the jitless parse cases isolate the
// default object JIT, so the three costs are not conflated.
// Upstream license: MIT, declared in package.json at the pinned base commit.
const makeSchema = () =>
  z
    .object({
      number: z.number(),
      negNumber: z.number(),
      maxNumber: z.number(),
      string: z.string(),
      longString: z.string(),
      boolean: z.boolean(),
      deeplyNested: z
        .object({
          foo: z.string(),
          num: z.number(),
          bool: z.boolean()
        })
        .passthrough()
    })
    .passthrough()

const parseCase = (input: unknown) => () => {
  const schema = makeSchema()
  return {
    run: () => {
      schema.parse(input)
      return true
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

const parseJitlessCase = (input: unknown) => () => {
  const schema = makeSchema()
  return {
    run: () => {
      schema.parse(input, { jitless: true })
      return true
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

const assertValidateCase = (input: unknown, compile: boolean) => () => {
  const schema = compile ? z.compile(makeSchema()) : makeSchema()
  return {
    run: () => {
      if (!z.validate(schema, input)) throw new Error("Invalid")
      return true
    },
    validate: (result: unknown) => assert.equal(result, true)
  }
}

export const assertLooseParseValid = parseCase(validData)
export const assertLooseParseExtraValid = parseCase(validDataWithExtras)

export const assertLooseParseJitlessValid = parseJitlessCase(validData)
export const assertLooseParseJitlessExtraValid = parseJitlessCase(validDataWithExtras)

export const assertLooseValidateValid = assertValidateCase(validData, false)
export const assertLooseValidateExtraValid = assertValidateCase(validDataWithExtras, false)

export const assertLooseCompiledValid = assertValidateCase(validData, true)
export const assertLooseCompiledExtraValid = assertValidateCase(validDataWithExtras, true)

const invalidCase = (compile: boolean) => () => {
  const schema = compile ? z.compile(makeSchema()) : makeSchema()
  return {
    run: () => z.validate(schema, invalidData),
    validate: (result: unknown) => assert.equal(result, false)
  }
}

export const assertLooseValidateInvalid = invalidCase(false)
export const assertLooseCompiledInvalid = invalidCase(true)

export const initializationSchema = () => ({
  run: makeSchema,
  validate: (schema: z.ZodObject) => assert.equal(schema.type, "object")
})

export const initializationCompiledSchema = () => ({
  run: () => z.compile(makeSchema()),
  validate: (schema: z.ZodObject) => assert.equal(schema.type, "object")
})
