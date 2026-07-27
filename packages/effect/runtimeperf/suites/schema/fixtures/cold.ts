import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import * as SchemaTransformation from "effect/SchemaTransformation"
import assert from "node:assert/strict"
import { Type } from "typebox"
import * as TypeBoxValue from "typebox/value"
import * as v from "valibot"
import { z } from "zod/v4"

const size = 32
const input = Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, `value${index}`]))

const makeEffectSchema = () =>
  Schema.Struct(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, Schema.String])))

const makeValibotSchema = () =>
  v.object(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, v.string()])))

const makeZodSchema = () =>
  z.object(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, z.string()])))

const makeTypeboxSchema = () =>
  Type.Object(Object.fromEntries(Array.from({ length: size }, (_, index) => [`field${index}`, Type.String()])))

const makeEffectRecordSchema = () => Schema.Record(Schema.String, Schema.String)

const makeValibotRecordSchema = () => v.record(v.string(), v.string())

const makeZodRecordSchema = () => z.record(z.string(), z.string())

const makeTypeboxRecordSchema = () => Type.Record(Type.String(), Type.String())

const literalValues100 = Array.from({ length: 100 }, (_, index) => `value${index}`)

const makeEffectLiteral100Schema = () => Schema.Literals(literalValues100)

const makeEffectTaggedMember = (index) =>
  Schema.Struct({
    kind: Schema.Literal(`kind${index}`),
    a: Schema.String,
    b: Schema.Number,
    c: Schema.Boolean
  })

const makeEffectTagged100Schema = () =>
  Schema.Union(Array.from({ length: 100 }, (_, index) => makeEffectTaggedMember(index)))

const makeEffectEncodingChain = (size) => {
  let schema = Schema.FiniteFromString
  for (let i = 1; i < size; i++) {
    schema = Schema.String.pipe(
      Schema.decodeTo(schema, SchemaTransformation.passthrough())
    )
  }
  return schema
}

export const effectSchemaCreationObject32 = () => ({
  run: makeEffectSchema,
  validate: (schema) => assert.equal(schema.ast._tag, "Objects")
})

export const valibotSchemaCreationObject32 = () => ({
  run: makeValibotSchema,
  validate: (schema) => assert.equal(schema.type, "object")
})

export const zodSchemaCreationObject32 = () => ({
  run: makeZodSchema,
  validate: (schema) => assert.equal(schema.type, "object")
})

export const typeboxSchemaCreationObject32 = () => ({
  run: makeTypeboxSchema,
  validate: (schema) => assert.equal(schema.type, "object")
})

export const effectFirstDecodeObject32 = () => ({
  run: () => SchemaParser.decodeUnknownExit(makeEffectSchema())(input),
  validate: (result) => assert.equal(result._tag, "Success")
})

export const valibotFirstDecodeObject32 = () => ({
  run: () => v.safeParse(makeValibotSchema(), input),
  validate: (result) => assert.equal(result.success, true)
})

export const zodFirstDecodeObject32 = () => ({
  run: () => makeZodSchema().safeParse(input, { jitless: true }),
  validate: (result) => assert.equal(result.success, true)
})

export const typeboxFirstDecodeObject32 = () => ({
  run: () => TypeBoxValue.Errors(makeTypeboxSchema(), input),
  validate: (errors) => assert.equal(errors.length, 0)
})

export const effectFirstDecodeRecord32 = () => ({
  run: () => SchemaParser.decodeUnknownExit(makeEffectRecordSchema())(input),
  validate: (result) => assert.equal(result._tag, "Success")
})

export const valibotFirstDecodeRecord32 = () => ({
  run: () => v.safeParse(makeValibotRecordSchema(), input),
  validate: (result) => assert.equal(result.success, true)
})

export const zodFirstDecodeRecord32 = () => ({
  run: () => makeZodRecordSchema().safeParse(input, { jitless: true }),
  validate: (result) => assert.equal(result.success, true)
})

export const typeboxFirstDecodeRecord32 = () => ({
  run: () => TypeBoxValue.Errors(makeTypeboxRecordSchema(), input),
  validate: (errors) => assert.equal(errors.length, 0)
})

export const effectFirstDecodeLiteral100 = () => ({
  run: () => SchemaParser.decodeUnknownExit(makeEffectLiteral100Schema())("value99"),
  validate: (result) => assert.equal(result._tag, "Success")
})

export const effectFirstDecodeTagged100 = () => ({
  run: () =>
    SchemaParser.decodeUnknownExit(makeEffectTagged100Schema())({
      kind: "kind99",
      a: "a",
      b: 1,
      c: true
    }),
  validate: (result) => assert.equal(result._tag, "Success")
})

export const effectFirstDecodeEncodingChain8 = () => ({
  run: () => SchemaParser.decodeUnknownExit(makeEffectEncodingChain(8))("123"),
  validate: (result) => {
    assert.equal(result._tag, "Success")
    assert.equal(result.value, 123)
  }
})
