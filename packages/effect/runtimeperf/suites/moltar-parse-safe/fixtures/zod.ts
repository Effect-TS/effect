import assert from "node:assert/strict"
import * as z from "zod/v4"
import { invalidData, validData, validDataWithExtras } from "./data.ts"

// The standard and compiled cases reproduce the adapters proposed in
// moltar/typescript-runtime-type-benchmarks#2329 at
// 34ebbad559318a8b5cc60fb92204db4c162fce50. The jitless cases isolate the
// default object JIT from full-schema compilation.
// Upstream license: MIT, declared in package.json at the pinned base commit.
const makeSchema = () =>
  z.object({
    number: z.number(),
    negNumber: z.number(),
    maxNumber: z.number(),
    string: z.string(),
    longString: z.string(),
    boolean: z.boolean(),
    deeplyNested: z.object({
      foo: z.string(),
      num: z.number(),
      bool: z.boolean()
    })
  })

const parseCase = (input: unknown) => () => {
  const schema = makeSchema()
  return {
    run: () => schema.parse(input),
    validate: (result: unknown) => assert.deepEqual(result, validData)
  }
}

const parseJitlessCase = (input: unknown) => () => {
  const schema = makeSchema()
  return {
    run: () => schema.parse(input, { jitless: true }),
    validate: (result: unknown) => assert.deepEqual(result, validData)
  }
}

const parseCompiledCase = (input: unknown) => () => {
  const schema = z.compile(makeSchema())
  return {
    run: () => schema.parse(input),
    validate: (result: unknown) => assert.deepEqual(result, validData)
  }
}

export const parseSafeValid = parseCase(validData)
export const parseSafeExtraValid = parseCase(validDataWithExtras)

export const parseSafeJitlessValid = parseJitlessCase(validData)
export const parseSafeJitlessExtraValid = parseJitlessCase(validDataWithExtras)

export const parseSafeCompiledValid = parseCompiledCase(validData)
export const parseSafeCompiledExtraValid = parseCompiledCase(validDataWithExtras)

const invalidCase = (parse: () => unknown) => ({
  run: () => {
    try {
      parse()
      return false
    } catch {
      return true
    }
  },
  validate: (result: unknown) => assert.equal(result, true)
})

export const parseSafeInvalid = () => {
  const schema = makeSchema()
  return invalidCase(() => schema.parse(invalidData))
}

export const parseSafeJitlessInvalid = () => {
  const schema = makeSchema()
  return invalidCase(() => schema.parse(invalidData, { jitless: true }))
}

export const parseSafeCompiledInvalid = () => {
  const schema = z.compile(makeSchema())
  return invalidCase(() => schema.parse(invalidData))
}

export const initializationSchema = () => ({
  run: makeSchema,
  validate: (schema: z.ZodObject) => assert.equal(schema.type, "object")
})

export const initializationCompiledSchema = () => ({
  run: () => z.compile(makeSchema()),
  validate: (schema: z.ZodObject) => assert.equal(schema.type, "object")
})
