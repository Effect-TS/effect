import assert from "node:assert/strict"
import * as z from "zod/v4"

const person = () => z.object({ name: z.string(), age: z.number(), active: z.boolean() })
const input = { name: "Ada", age: 37, active: true }
const small = person()
const nestedSchema = z.object({ user: person(), tags: z.array(z.string()) })
const arraySchema = z.array(person())
const arrayInput = Array.from({ length: 32 }, () => ({ ...input }))
const recordSchema = z.record(z.string(), person())
const recordInput = Object.fromEntries(arrayInput.map((value, i) => [String(i), value]))
const unionSchema = z.union(
  Array.from({ length: 8 }, (_, i) => z.object({ tag: z.literal(i), value: z.number() })) as [
    z.ZodObject,
    z.ZodObject,
    ...Array<z.ZodObject>
  ]
)
const fields = Object.fromEntries(
  Array.from({ length: 32 }, (_, i) => [`v${i}`, z.string().transform(Number)])
)
const transformedSchema = z.object(fields)
const transformedInput = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`v${i}`, String(i)]))
const transformedOutput = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`v${i}`, i]))
const checkedTransform = z.string().transform(Number).pipe(z.number().positive())
const declarationSchema = z.set(person())
const declarationInput = new Set(arrayInput)
const defaultsSchema = z.object(
  Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`v${i}`, z.number().default(i)]))
)

type Case = {
  readonly schema: z.ZodType
  readonly input: unknown
  readonly expected: unknown
  readonly operation?: "is" | "make" | "encode"
  readonly invalid?: boolean
}

const cases: Record<string, Case> = {
  parseValid: { schema: small, input, expected: input },
  parseExtra: { schema: small, input: { ...input, extra: 1 }, expected: input },
  parseInvalid: { schema: small, input: { ...input, age: "bad" }, expected: true, invalid: true },
  isValid: { schema: small, input, expected: true, operation: "is" },
  isInvalid: { schema: small, input: { ...input, age: "bad" }, expected: false, operation: "is" },
  encode: { schema: small, input, expected: input, operation: "encode" },
  strict: {
    schema: z.strictObject({ name: z.string(), age: z.number(), active: z.boolean() }),
    input,
    expected: input
  },
  nested: {
    schema: nestedSchema,
    input: { user: input, tags: ["a", "b"] },
    expected: { user: input, tags: ["a", "b"] }
  },
  array: { schema: arraySchema, input: arrayInput, expected: arrayInput },
  arrayInvalid: {
    schema: arraySchema,
    input: [...arrayInput, { ...input, age: "bad" }],
    expected: true,
    invalid: true
  },
  record: { schema: recordSchema, input: recordInput, expected: recordInput },
  union: { schema: unionSchema, input: { tag: 7, value: 1 }, expected: { tag: 7, value: 1 } },
  transform: { schema: transformedSchema, input: transformedInput, expected: transformedOutput },
  transformInvalid: { schema: checkedTransform, input: "-1", expected: true, invalid: true },
  declaration: { schema: declarationSchema, input: declarationInput, expected: declarationInput },
  makeStruct: { schema: defaultsSchema, input: {}, expected: transformedOutput, operation: "make" },
  makeArray: { schema: arraySchema, input: arrayInput, expected: arrayInput, operation: "make" },
  makeUnion: {
    schema: unionSchema,
    input: { tag: 7, value: 1 },
    expected: { tag: 7, value: 1 },
    operation: "make"
  }
}

const fixture = (name: string) => {
  const { schema: source, input, expected, operation, invalid } = cases[name]
  const schema = z.compile(source, { strict: true })
  const parse = operation === "is" ?
    (input: unknown) => z.validate(schema, input)
    : operation === "encode" ?
    (input: unknown) => z.encode(schema, input)
    : (input: unknown) => schema.parse(input)
  return {
    run: invalid ?
      () => {
        try {
          parse(input)
          return false
        } catch {
          return true
        }
      } :
      () => parse(input),
    validate: (result: unknown) => assert.deepEqual(result, expected)
  }
}

export const parseValid = () => fixture("parseValid")
export const parseExtra = () => fixture("parseExtra")
export const parseInvalid = () => fixture("parseInvalid")
export const isValid = () => fixture("isValid")
export const isInvalid = () => fixture("isInvalid")
export const encode = () => fixture("encode")
export const strict = () => fixture("strict")
export const nested = () => fixture("nested")
export const array = () => fixture("array")
export const arrayInvalid = () => fixture("arrayInvalid")
export const record = () => fixture("record")
export const union = () => fixture("union")
export const transform = () => fixture("transform")
export const transformInvalid = () => fixture("transformInvalid")
export const declaration = () => fixture("declaration")
export const makeStruct = () => fixture("makeStruct")
export const makeArray = () => fixture("makeArray")
export const makeUnion = () => fixture("makeUnion")
