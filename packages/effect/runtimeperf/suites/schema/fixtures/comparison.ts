import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"
import * as v from "valibot"
import { z } from "zod/v4"

const effectCase = (schema, input, success) => () => {
  const run = SchemaParser.decodeUnknownExit(schema)
  return {
    run: () => run(input),
    validate: (result) => {
      assert.equal(result._tag, success ? "Success" : "Failure")
      if (success) assert.deepEqual(result.value, input)
    }
  }
}

const valibotCase = (schema, input, success) => () => {
  const run = v.safeParser(schema)
  return {
    run: () => run(input),
    validate: (result) => {
      assert.equal(result.success, success)
      if (success) assert.deepEqual(result.output, input)
    }
  }
}

const zodCase = (schema, input, success) => () => {
  return {
    run: () => schema.safeParse(input, { jitless: true }),
    validate: (result) => {
      assert.equal(result.success, success)
      if (success) assert.deepEqual(result.data, input)
    }
  }
}

const makeObjectInput = (size) =>
  Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, `value${index}`]))

const makeInvalidLastObjectInput = (size) => ({
  ...makeObjectInput(size),
  [`field${size - 1}`]: 1
})

const makeEffectObject = (size) =>
  Schema.Struct(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, Schema.String])))

const makeValibotObject = (size) =>
  v.object(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, v.string()])))

const makeZodObject = (size) =>
  z.object(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, z.string()])))

const object1 = makeObjectInput(1)
const effectObject1 = makeEffectObject(1)
const valibotObject1 = makeValibotObject(1)
const zodObject1 = makeZodObject(1)

export const effectObject1Valid = effectCase(effectObject1, object1, true)
export const valibotObject1Valid = valibotCase(valibotObject1, object1, true)
export const zodObject1Valid = zodCase(zodObject1, object1, true)

export const effectObject1Invalid = effectCase(effectObject1, { field0: 1 }, false)
export const valibotObject1Invalid = valibotCase(valibotObject1, { field0: 1 }, false)
export const zodObject1Invalid = zodCase(zodObject1, { field0: 1 }, false)

const object32 = makeObjectInput(32)
const object32InvalidLast = makeInvalidLastObjectInput(32)
const effectObject32 = makeEffectObject(32)
const valibotObject32 = makeValibotObject(32)
const zodObject32 = makeZodObject(32)

export const effectObject32Valid = effectCase(effectObject32, object32, true)
export const valibotObject32Valid = valibotCase(valibotObject32, object32, true)
export const zodObject32Valid = zodCase(zodObject32, object32, true)

export const effectObject32InvalidLast = effectCase(effectObject32, object32InvalidLast, false)
export const valibotObject32InvalidLast = valibotCase(valibotObject32, object32InvalidLast, false)
export const zodObject32InvalidLast = zodCase(zodObject32, object32InvalidLast, false)

const array32 = Array.from({ length: 32 }, (_, index) => `value${index}`)
const array32InvalidLast = array32.slice()
array32InvalidLast[array32InvalidLast.length - 1] = 1
const effectArray32 = Schema.Array(Schema.String)
const valibotArray32 = v.array(v.string())
const zodArray32 = z.array(z.string())

export const effectArray32Valid = effectCase(effectArray32, array32, true)
export const valibotArray32Valid = valibotCase(valibotArray32, array32, true)
export const zodArray32Valid = zodCase(zodArray32, array32, true)

export const effectArray32InvalidLast = effectCase(effectArray32, array32InvalidLast, false)
export const valibotArray32InvalidLast = valibotCase(valibotArray32, array32InvalidLast, false)
export const zodArray32InvalidLast = zodCase(zodArray32, array32InvalidLast, false)

const record32 = makeObjectInput(32)
const record32InvalidLast = makeInvalidLastObjectInput(32)
const effectRecord32 = Schema.Record(Schema.String, Schema.String)
const valibotRecord32 = v.record(v.string(), v.string())
const zodRecord32 = z.record(z.string(), z.string())

export const effectRecord32Valid = effectCase(effectRecord32, record32, true)
export const valibotRecord32Valid = valibotCase(valibotRecord32, record32, true)
export const zodRecord32Valid = zodCase(zodRecord32, record32, true)

export const effectRecord32InvalidLast = effectCase(effectRecord32, record32InvalidLast, false)
export const valibotRecord32InvalidLast = valibotCase(valibotRecord32, record32InvalidLast, false)
export const zodRecord32InvalidLast = zodCase(zodRecord32, record32InvalidLast, false)

const literalValues = Array.from({ length: 100 }, (_, index) => `value${index}`)
const effectLiteral100 = Schema.Literals(literalValues)
const valibotLiteral100 = v.union(literalValues.map(v.literal))
const zodLiteral100 = z.union(literalValues.map((value) => z.literal(value)))

export const effectLiteral100ValidLast = effectCase(effectLiteral100, "value99", true)
export const valibotLiteral100ValidLast = valibotCase(valibotLiteral100, "value99", true)
export const zodLiteral100ValidLast = zodCase(zodLiteral100, "value99", true)

export const effectLiteral100Invalid = effectCase(effectLiteral100, "missing", false)
export const valibotLiteral100Invalid = valibotCase(valibotLiteral100, "missing", false)
export const zodLiteral100Invalid = zodCase(zodLiteral100, "missing", false)

const makeEffectTaggedMember = (index) =>
  Schema.Struct({
    kind: Schema.Literal(`kind${index}`),
    a: Schema.String,
    b: Schema.Number,
    c: Schema.Boolean
  })

const makeValibotTaggedMember = (index) =>
  v.object({
    kind: v.literal(`kind${index}`),
    a: v.string(),
    b: v.number(),
    c: v.boolean()
  })

const makeZodTaggedMember = (index) =>
  z.object({
    kind: z.literal(`kind${index}`),
    a: z.string(),
    b: z.number(),
    c: z.boolean()
  })

const taggedInput = { kind: "kind99", a: "a", b: 1, c: true }
const taggedInvalidSelected = { kind: "kind99", a: "a", b: 1, c: "invalid" }
const taggedInvalidTag = { kind: "missing", a: "a", b: 1, c: true }
const effectTagged100 = Schema.Union(Array.from({ length: 100 }, (_, index) => makeEffectTaggedMember(index)))
const valibotTagged100 = v.variant(
  "kind",
  Array.from({ length: 100 }, (_, index) => makeValibotTaggedMember(index))
)
const zodTagged100 = z.discriminatedUnion(
  "kind",
  Array.from({ length: 100 }, (_, index) => makeZodTaggedMember(index))
)

export const effectTagged100ValidLast = effectCase(effectTagged100, taggedInput, true)
export const valibotTagged100ValidLast = valibotCase(valibotTagged100, taggedInput, true)
export const zodTagged100ValidLast = zodCase(zodTagged100, taggedInput, true)

export const effectTagged100InvalidSelected = effectCase(effectTagged100, taggedInvalidSelected, false)
export const valibotTagged100InvalidSelected = valibotCase(valibotTagged100, taggedInvalidSelected, false)
export const zodTagged100InvalidSelected = zodCase(zodTagged100, taggedInvalidSelected, false)

export const effectTagged100InvalidTag = effectCase(effectTagged100, taggedInvalidTag, false)
export const valibotTagged100InvalidTag = valibotCase(valibotTagged100, taggedInvalidTag, false)
export const zodTagged100InvalidTag = zodCase(zodTagged100, taggedInvalidTag, false)

const effectNonEmpty = Schema.NonEmptyString
const valibotNonEmpty = v.pipe(v.string(), v.nonEmpty())
const zodNonEmpty = z.string().min(1)

export const effectNonEmptyValid = effectCase(effectNonEmpty, "value", true)
export const valibotNonEmptyValid = valibotCase(valibotNonEmpty, "value", true)
export const zodNonEmptyValid = zodCase(zodNonEmpty, "value", true)

export const effectNonEmptyInvalid = effectCase(effectNonEmpty, "", false)
export const valibotNonEmptyInvalid = valibotCase(valibotNonEmpty, "", false)
export const zodNonEmptyInvalid = zodCase(zodNonEmpty, "", false)
