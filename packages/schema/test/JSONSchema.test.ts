import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as S from "@effect/schema/Schema"
import AjvNonEsm from "ajv"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const Ajv = AjvNonEsm.default

type JsonArray = ReadonlyArray<Json>

type JsonObject = { readonly [key: string]: Json }

type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

const propertyTo = <A, I>(schema: S.Schema<A, I>, options?: {
  params?: fc.Parameters<[A]>
}) => {
  const arbitrary = A.make(schema)
  const is = S.is(schema)
  const jsonSchema = JSONSchema.make(schema)
  // console.log(JSON.stringify(jsonSchema, null, 2))
  // const decodedSchema = JSONSchema.decode<A>(jsonSchema)
  // console.log(decodedSchema)
  // const decodedIs = S.is(decodedSchema)
  const validate = new Ajv({ strictTuples: false, allowUnionTypes: true }).compile(
    jsonSchema
  )
  const arb = arbitrary(fc)
  // console.log(JSON.stringify(fc.sample(arb, 10), null, 2))
  fc.assert(
    fc.property(
      arb,
      (a) =>
        is(a)
        && validate(a)
      // && decodedIs(a)
    ),
    options?.params
  )
  // expect(JSONSchema.to(decodedSchema)).toStrictEqual(jsonSchema)
}

const JsonNumber = S.number.pipe(
  S.filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    jsonSchema: { type: "number" }
  })
)

describe("JSONSchema", () => {
  it("declaration should raise an error", () => {
    const schema = S.chunk(JsonNumber)
    expect(() => JSONSchema.make(schema)).toThrow(
      new Error("cannot build a JSON Schema for a declaration without a JSON Schema annotation")
    )
  })

  it("bigint should raise an error", () => {
    expect(() => JSONSchema.make(S.bigint)).toThrow(
      new Error("cannot build a JSON Schema for `bigint` without a JSON Schema annotation")
    )
  })

  it("symbol should raise an error", () => {
    expect(() => JSONSchema.make(S.symbol)).toThrow(
      new Error("cannot build a JSON Schema for `symbol` without a JSON Schema annotation")
    )
  })

  it("a unique symbol should raise an error", () => {
    expect(() => JSONSchema.make(S.uniqueSymbol(Symbol.for("@effect/schema/test/a")))).toThrow(
      new Error("cannot build a JSON Schema for a unique symbol without a JSON Schema annotation")
    )
  })

  it("undefined should raise an error", () => {
    expect(() => JSONSchema.make(S.undefined)).toThrow(
      new Error("cannot build a JSON Schema for `undefined` without a JSON Schema annotation")
    )
  })

  it("void should raise an error", () => {
    expect(() => JSONSchema.make(S.void)).toThrow(
      new Error("cannot build a JSON Schema for `void` without a JSON Schema annotation")
    )
  })

  it("never should raise an error", () => {
    expect(() => JSONSchema.make(S.never)).toThrow(
      new Error("cannot build a JSON Schema for `never` without a JSON Schema annotation")
    )
  })

  it("any", () => {
    propertyTo(S.any)
  })

  it("unknown", () => {
    propertyTo(S.unknown)
  })

  it("object", () => {
    const schema = S.object
    const jsonSchema = JSONSchema.make(schema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
    propertyTo(S.object)
  })

  it("string", () => {
    propertyTo(S.string)
  })

  it("JsonNumber", () => {
    propertyTo(JsonNumber)
  })

  it("boolean", () => {
    propertyTo(S.boolean)
  })

  describe("literal", () => {
    it("null", () => {
      propertyTo(S.null)
    })

    it("string", () => {
      const schema = S.literal("a")
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": "a"
      })
      propertyTo(schema)
    })

    it("number", () => {
      const schema = S.literal(1)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": 1
      })
      propertyTo(schema)
    })

    it("boolean", () => {
      const schema = S.literal(true)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": true
      })
      propertyTo(S.literal(true))
      propertyTo(S.literal(false))
    })

    it("bigint should raise an error", () => {
      expect(() => JSONSchema.make(S.literal(1n))).toThrow(
        new Error("cannot build a JSON Schema for a bigint literal without a JSON Schema annotation")
      )
    })
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$comment": "/schemas/enums",
        "oneOf": [
          {
            "title": "Apple",
            "const": 0
          },
          {
            "title": "Banana",
            "const": 1
          }
        ]
      })
      propertyTo(schema)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana"
      }
      const schema = S.enums(Fruits)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$comment": "/schemas/enums",
        "oneOf": [
          {
            "title": "Apple",
            "const": "apple"
          },
          {
            "title": "Banana",
            "const": "banana"
          }
        ]
      })
      propertyTo(schema)
    })

    it("String/Number enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums(Fruits)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$comment": "/schemas/enums",
        "oneOf": [
          {
            "title": "Apple",
            "const": "apple"
          },
          {
            "title": "Banana",
            "const": "banana"
          },
          {
            "title": "Cantaloupe",
            "const": 0
          }
        ]
      })
      propertyTo(schema)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.enums(Fruits)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$comment": "/schemas/enums",
        "oneOf": [
          {
            "title": "Apple",
            "const": "apple"
          },
          {
            "title": "Banana",
            "const": "banana"
          },
          {
            "title": "Cantaloupe",
            "const": 3
          }
        ]
      })
      propertyTo(schema)
    })
  })

  describe("unions", () => {
    it("string | number", () => {
      const schema = S.union(S.string, JsonNumber)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          {
            "type": "number",
            "description": "a number",
            "title": "number"
          },
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          }
        ]
      })
      propertyTo(schema)
    })

    it(`1 | "a"`, () => {
      const schema = S.literal(1, 2)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [1, 2]
      })
      propertyTo(schema)
    })

    it(`1 | true | string`, () => {
      const schema = S.union(S.literal(1, true), S.string)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          { "enum": [1, true] }
        ]
      })
      propertyTo(schema)
    })

    it(`1 | true(with description) | string`, () => {
      const schema = S.union(
        S.literal(1),
        S.literal(true).pipe(S.description("description")),
        S.string
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          { "const": true, "description": "description" },
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          { "const": 1 }
        ]
      })
      propertyTo(schema)
    })

    it(`1 | 2 | true(with description) | string`, () => {
      const schema = S.union(
        S.literal(1, 2),
        S.literal(true).pipe(S.description("description")),
        S.string
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          { "const": true, "description": "description" },
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          { "enum": [1, 2] }
        ]
      })
      propertyTo(schema)
    })

    it("union of literals with descriptions", () => {
      const schema = S.union(
        S.literal("foo").pipe(S.description("I'm a foo")),
        S.literal("bar").pipe(S.description("I'm a bar"))
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          {
            "const": "foo",
            "description": "I'm a foo"
          },
          {
            "const": "bar",
            "description": "I'm a bar"
          }
        ]
      })
    })

    it("union of literals with identifier", () => {
      const schema = S.union(
        S.literal("foo").pipe(S.description("I'm a foo"), S.identifier("foo")),
        S.literal("bar").pipe(S.description("I'm a bar"), S.identifier("bar"))
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$defs": {
          "bar": {
            "const": "bar",
            "description": "I'm a bar"
          },
          "foo": {
            "const": "foo",
            "description": "I'm a foo"
          }
        },
        "anyOf": [
          {
            "$ref": "#/$defs/foo"
          },
          {
            "$ref": "#/$defs/bar"
          }
        ]
      })
    })
  })

  describe("tuple", () => {
    it("e?", () => {
      const schema = S.tuple().pipe(S.optionalElement(JsonNumber))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "number",
            "title": "number",
            "description": "a number"
          }
        ],
        "additionalItems": false
      })
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      propertyTo(schema)
    })

    it("e + e?", () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(JsonNumber))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "minItems": 1,
        "items": [
          {
            "type": "string",
            "title": "string",
            "description": "a string"
          },
          {
            "type": "number",
            "title": "number",
            "description": "a number"
          }
        ],
        "additionalItems": false
      })
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      propertyTo(schema)
    })

    it("e? + r", () => {
      const schema = S.tuple().pipe(
        S.optionalElement(S.string),
        S.rest(JsonNumber)
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "string",
            "title": "string",
            "description": "a string"
          }
        ],
        "additionalItems": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      })
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      expect(validate(["a", "b", 1])).toEqual(false)
      propertyTo(schema)
    })

    it("r + e should raise an error", () => {
      const schema = S.array(JsonNumber).pipe(S.element(S.string))
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error(
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("empty", () => {
      const schema = S.tuple()
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "maxItems": 0
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(false)
    })

    it("e", () => {
      const schema = S.tuple(JsonNumber)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [{
          "type": "number",
          "title": "number",
          "description": "a number"
        }],
        "minItems": 1,
        "additionalItems": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
      propertyTo(schema)
    })

    it("e + r", () => {
      const schema = S.tuple(S.string).pipe(S.rest(JsonNumber))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [{
          "type": "string",
          "title": "string",
          "description": "a string"
        }],
        "minItems": 1,
        "additionalItems": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      })
      const validate = new Ajv({ strictTuples: false }).compile({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [
          {
            "type": "string",
            "title": "string",
            "description": "a string"
          }
        ],
        "minItems": 1,
        "additionalItems": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      })
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate(["a", 1, 2])).toEqual(true)
      expect(validate(["a", 1, 2, 3])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate(["a", "b"])).toEqual(false)
      propertyTo(schema)
    })

    it("r", () => {
      const schema = S.array(JsonNumber)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate([1, 2])).toEqual(true)
      expect(validate([1, 2, 3])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2, 3, "a"])).toEqual(false)
      propertyTo(schema)
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.struct({})
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$id": "/schemas/{}",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "oneOf": [{
          "type": "object"
        }, {
          "type": "array"
        }]
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ a: 1 })).toEqual(true)
      expect(validate([])).toEqual(true)
      expect(validate(null)).toEqual(false)
      expect(validate(1)).toEqual(false)
      expect(validate(true)).toEqual(false)
      propertyTo(schema)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: JsonNumber })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "a": {
            "type": "string",
            "title": "string",
            "description": "a string"
          },
          "b": {
            "type": "number",
            "title": "number",
            "description": "a number"
          }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyTo(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({
        a: S.string,
        b: S.optional(JsonNumber, { exact: true })
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "a": {
            "type": "string",
            "title": "string",
            "description": "a string"
          },
          "b": {
            "type": "number",
            "title": "number",
            "description": "a number"
          }
        },
        "required": ["a"],
        "additionalProperties": false
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyTo(schema)
    })

    it("should raise an error if there is a property named with a symbol", () => {
      const a = Symbol.for("@effect/schema/test/a")
      expect(() => JSONSchema.make(S.struct({ [a]: S.string }))).toThrow(
        new Error("Cannot encode Symbol(@effect/schema/test/a) key to JSON Schema")
      )
    })
  })

  describe("record", () => {
    it("record(symbol, number)", () => {
      expect(() => JSONSchema.make(S.record(S.symbolFromSelf, JsonNumber))).toThrow(
        new Error("Unsupported index signature parameter (symbol)")
      )
    })

    it("record(refinement, number)", () => {
      expect(() => JSONSchema.make(S.record(S.string.pipe(S.minLength(1)), JsonNumber))).toThrow(
        new Error("Unsupported index signature parameter (a string at least 1 character(s) long)")
      )
    })

    it("record(string, number)", () => {
      const schema = S.record(S.string, JsonNumber)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: 1, b: 2 })).toEqual(true)
      expect(validate({ a: 1, b: "b" })).toEqual(false)
      propertyTo(schema)
    })

    it("record('a' | 'b', number)", () => {
      const schema = S.record(
        S.union(S.literal("a"), S.literal("b")),
        JsonNumber
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "a": {
            "type": "number",
            "title": "number",
            "description": "a number"
          },
          "b": {
            "type": "number",
            "title": "number",
            "description": "a number"
          }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      })
      propertyTo(schema)
    })

    it("record(${string}-${string}, number)", () => {
      const schema = S.record(
        S.templateLiteral(S.string, S.literal("-"), S.string),
        JsonNumber
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [],
        "properties": {},
        "additionalProperties": false,
        "patternProperties": {
          "^.*-.*$": {
            "type": "number",
            "description": "a number",
            "title": "number"
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ "-": 1 })).toEqual(true)
      expect(validate({ "a-": 1 })).toEqual(true)
      expect(validate({ "-b": 1 })).toEqual(true)
      expect(validate({ "a-b": 1 })).toEqual(true)
      expect(validate({ "": 1 })).toEqual(false)
      expect(validate({ "-": "a" })).toEqual(false)
      propertyTo(schema)
    })

    it("record(pattern, number)", () => {
      const schema = S.record(
        S.string.pipe(S.pattern(new RegExp("^.*-.*$"))),
        JsonNumber
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [],
        "properties": {},
        "additionalProperties": false,
        "patternProperties": {
          "^.*-.*$": {
            "type": "number",
            "description": "a number",
            "title": "number"
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ "-": 1 })).toEqual(true)
      expect(validate({ "a-": 1 })).toEqual(true)
      expect(validate({ "-b": 1 })).toEqual(true)
      expect(validate({ "a-b": 1 })).toEqual(true)
      expect(validate({ "": 1 })).toEqual(false)
      expect(validate({ "-": "a" })).toEqual(false)
      propertyTo(schema)
    })
  })

  it("struct + record", () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.extend(S.record(S.string, S.string))
    )
    const jsonSchema = JSONSchema.make(schema)
    expect(jsonSchema).toStrictEqual({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "required": [
        "a"
      ],
      "properties": {
        "a": {
          "type": "string",
          "title": "string",
          "description": "a string"
        }
      },
      "additionalProperties": {
        "type": "string",
        "title": "string",
        "description": "a string"
      }
    })
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({ a: "a" })).toEqual(true)
    expect(validate({ a: "a", b: "b" })).toEqual(true)
    expect(validate({})).toEqual(false)
    expect(validate({ b: "b" })).toEqual(false)
    expect(validate({ a: 1 })).toEqual(false)
    expect(validate({ a: "a", b: 1 })).toEqual(false)
    propertyTo(schema)
  })

  describe("refinement", () => {
    it("should raise an error when an annotation doesn't exist", () => {
      const schema = S.string.pipe(S.filter(() => true))
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error("cannot build a JSON Schema for a refinement without a JSON Schema annotation")
      )
    })

    it("minLength", () => {
      const schema = S.string.pipe(S.minLength(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
      propertyTo(schema)
    })

    it("maxLength", () => {
      const schema = S.string.pipe(S.maxLength(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
      propertyTo(schema)
    })

    it("greaterThan", () => {
      const schema = JsonNumber.pipe(S.greaterThan(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
      propertyTo(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = JsonNumber.pipe(S.greaterThanOrEqualTo(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
      propertyTo(schema)
    })

    it("lessThan", () => {
      const schema = JsonNumber.pipe(S.lessThan(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
      propertyTo(schema)
    })

    it("lessThanOrEqualTo", () => {
      const schema = JsonNumber.pipe(S.lessThanOrEqualTo(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
      propertyTo(schema)
    })

    it("pattern", () => {
      const schema = S.string.pipe(S.pattern(/^abb+$/))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
      propertyTo(schema)
    })

    it("integer", () => {
      const schema = JsonNumber.pipe(S.int())
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "integer",
        "title": "integer",
        "description": "an integer"
      })
      propertyTo(schema)
    })
  })

  it("TemplateLiteral", () => {
    const schema = S.templateLiteral(S.literal("a"), S.number)
    const jsonSchema = JSONSchema.make(schema)
    expect(jsonSchema).toEqual({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "string",
      "pattern": "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$",
      "description": "a template literal"
    })
    const validate = new Ajv().compile(jsonSchema)
    expect(validate("a1")).toEqual(true)
    expect(validate("a12")).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate("aa")).toEqual(false)
  })

  describe("Suspend", () => {
    it("should raise an error if there is no identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
      })
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error(
          "Generating a JSON Schema for suspended schemas requires an identifier annotation"
        )
      )
    })

    it("should support outer suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.suspend(() =>
        S.struct({
          a: S.string,
          as: S.array(schema)
        })
      ).pipe(S.identifier("A"))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/A",
        "$defs": {
          "A": {
            "type": "object",
            "required": [
              "a",
              "as"
            ],
            "properties": {
              "a": {
                "type": "string",
                "description": "a string",
                "title": "string"
              },
              "as": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/A"
                }
              }
            },
            "additionalProperties": false
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a1", as: [] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] })).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      ).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      ).toEqual(false)
      propertyTo(schema)
    })

    it("should support inner suspended schemas with inner identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema).pipe(S.identifier("A")))
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "a",
          "as"
        ],
        "properties": {
          "a": {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          "as": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/A"
            }
          }
        },
        "additionalProperties": false,
        "$defs": {
          "A": {
            "type": "object",
            "required": [
              "a",
              "as"
            ],
            "properties": {
              "a": {
                "type": "string",
                "description": "a string",
                "title": "string"
              },
              "as": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/A"
                }
              }
            },
            "additionalProperties": false
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a1", as: [] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] })).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      ).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      ).toEqual(false)
      propertyTo(schema)
    })

    it("should support inner suspended schemas with outer identifier annotation", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const schema: S.Schema<Category> = S.struct({
        name: S.string,
        categories: S.array(S.suspend(() => schema))
      }).pipe(S.identifier("Category"))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/Category",
        "$defs": {
          "Category": {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string",
                "description": "a string",
                "title": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/Category"
                }
              }
            },
            "additionalProperties": false
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ name: "a1", categories: [] })).toEqual(true)
      expect(validate({ name: "a1", categories: [{ name: "a2", categories: [] }] })).toEqual(true)
      expect(validate({ name: "a1", categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [] }] }))
        .toEqual(true)
      expect(
        validate({
          name: "a1",
          categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [{ name: "a4", categories: [] }] }]
        })
      ).toEqual(true)
      expect(
        validate({
          name: "a1",
          categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [{ name: "a4", categories: [1] }] }]
        })
      ).toEqual(false)
      propertyTo(schema)
    })

    it("should support mutually suspended schemas", () => {
      interface Expression {
        readonly type: "expression"
        readonly value: number | Operation
      }

      interface Operation {
        readonly type: "operation"
        readonly operator: "+" | "-"
        readonly left: Expression
        readonly right: Expression
      }

      const Expression: S.Schema<Expression> = S.suspend(() =>
        S.struct({
          type: S.literal("expression"),
          value: S.union(JsonNumber, Operation)
        })
      ).pipe(S.identifier("Expression"))

      const Operation: S.Schema<Operation> = S.suspend(() =>
        S.struct({
          type: S.literal("operation"),
          operator: S.union(S.literal("+"), S.literal("-")),
          left: Expression,
          right: Expression
        })
      ).pipe(S.identifier("Operation"))

      const jsonSchema = JSONSchema.make(Operation)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/Operation",
        "$defs": {
          "Operation": {
            "type": "object",
            "required": [
              "type",
              "operator",
              "left",
              "right"
            ],
            "properties": {
              "type": {
                "const": "operation"
              },
              "operator": {
                "enum": ["+", "-"]
              },
              "left": {
                "$ref": "#/$defs/Expression"
              },
              "right": {
                "$ref": "#/$defs/Expression"
              }
            },
            "additionalProperties": false
          },
          "Expression": {
            "type": "object",
            "required": [
              "type",
              "value"
            ],
            "properties": {
              "type": {
                "const": "expression"
              },
              "value": {
                "anyOf": [
                  {
                    "$ref": "#/$defs/Operation"
                  },
                  {
                    "type": "number",
                    "description": "a number",
                    "title": "number"
                  }
                ]
              }
            },
            "additionalProperties": false
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({
        type: "operation",
        operator: "+",
        left: {
          type: "expression",
          value: 1
        },
        right: {
          type: "expression",
          value: {
            type: "operation",
            operator: "-",
            left: {
              type: "expression",
              value: 3
            },
            right: {
              type: "expression",
              value: 2
            }
          }
        }
      })).toEqual(true)
      propertyTo(Operation, { params: { numRuns: 5 } })
    })

    it("should handle identifier annotations when generating a schema through `from()`", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }

      const schema: S.Schema<Category> = S.struct({
        name: S.string,
        categories: S.array(S.suspend(() => schema).pipe(S.identifier("Category")))
      })
      const jsonSchema = JSONSchema.make(S.from(schema))
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "name",
          "categories"
        ],
        "properties": {
          "name": {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          "categories": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/Category"
            }
          }
        },
        "additionalProperties": false,
        "$defs": {
          "Category": {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string",
                "description": "a string",
                "title": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/Category"
                }
              }
            },
            "additionalProperties": false
          }
        }
      })
    })
  })

  describe("annotations", () => {
    it("examples support", () => {
      const schema = S.string.pipe(S.examples(["a", "b"]))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "examples": ["a", "b"]
      })
    })

    it("default support", () => {
      const schema = S.string.pipe(S.default(""))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "default": ""
      })
    })

    it("PropertySignature support", () => {
      const schema = S.struct({
        foo: S.asPropertySignature(S.string).annotations({
          description: "foo description",
          title: "foo title",
          examples: ["foo example"]
        }),
        bar: S.asPropertySignature(JsonNumber).annotations({
          description: "bar description",
          title: "bar title",
          examples: ["bar example"]
        })
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "foo",
          "bar"
        ],
        "properties": {
          "foo": {
            "type": "string",
            "description": "foo description",
            "title": "foo title",
            "examples": [
              "foo example"
            ]
          },
          "bar": {
            "type": "number",
            "description": "bar description",
            "title": "bar title",
            "examples": [
              "bar example"
            ]
          }
        },
        "additionalProperties": false
      })
    })
  })

  describe("Class", () => {
    it("should support S.from(Class)", () => {
      class A extends S.Class<A>()({ a: S.string }) {}
      const jsonSchema = JSONSchema.make(S.from(A))
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "type": "string",
            "description": "a string",
            "title": "string"
          }
        },
        "additionalProperties": false
      })
    })
  })

  describe("identifier annotations support", () => {
    it("on root level schema", () => {
      const schema = S.string.pipe(S.identifier("Name"))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/Name",
        "$defs": {
          "Name": {
            "type": "string",
            "description": "a string",
            "title": "string"
          }
        }
      })
    })

    it("on nested schemas", () => {
      const Name = S.string.pipe(
        S.identifier("Name"),
        S.description("a name"),
        S.title("Name")
      )
      const schema = S.struct({ a: Name, b: S.struct({ c: Name }) })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "a",
          "b"
        ],
        "properties": {
          "a": {
            "$ref": "#/$defs/Name"
          },
          "b": {
            "type": "object",
            "required": [
              "c"
            ],
            "properties": {
              "c": {
                "$ref": "#/$defs/Name"
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false,
        "$defs": {
          "Name": {
            "type": "string",
            "description": "a name",
            "title": "Name"
          }
        }
      })
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "name1", b: { c: "name2" } })).toEqual(true)
      expect(validate({ a: 1 })).toEqual(false)
    })
  })

  describe("should handle annotations", () => {
    it("void", () => {
      const schema = S.void.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "title": "void"
      })
    })

    it("never", () => {
      const schema = S.never.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "title": "never"
      })
    })

    it("literal", () => {
      const schema = S.literal("a").pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("symbolFromSelf", () => {
      const schema = S.symbolFromSelf.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "a symbol",
        "title": "symbol",
        "type": "custom JSON Schema"
      })
    })

    it("uniqueSymbol", () => {
      const schema = S.uniqueSymbol(Symbol.for("effect/schema/test/a")).pipe(
        S.jsonSchema({ "type": "custom JSON Schema" })
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("templateLiteral", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b")).pipe(
        S.jsonSchema({ "type": "custom JSON Schema" })
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("undefined", () => {
      const schema = S.undefined.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "title": "undefined"
      })
    })

    it("unknown", () => {
      const schema = S.unknown.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "title": "unknown"
      })
    })

    it("any", () => {
      const schema = S.any.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "title": "any"
      })
    })

    it("object", () => {
      const schema = S.object.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/object",
        "$defs": {
          "object": {
            "type": "custom JSON Schema",
            "description": "an object in the TypeScript meaning, i.e. the `object` type",
            "title": "object"
          }
        }
      })
    })

    it("string", () => {
      const schema = S.string.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "description": "a string",
        "title": "string"
      })
    })

    it("number", () => {
      const schema = S.number.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "description": "a number",
        "title": "number"
      })
    })

    it("bigintFromSelf", () => {
      const schema = S.bigintFromSelf.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "description": "a bigint",
        "title": "bigint"
      })
    })

    it("boolean", () => {
      const schema = S.boolean.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "description": "a boolean",
        "title": "boolean"
      })
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits).pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number).pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number }).pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("union", () => {
      const schema = S.union(S.string, S.number).pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema).pipe(S.jsonSchema({ "type": "custom JSON Schema" })))
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [
          "a",
          "as"
        ],
        "properties": {
          "a": {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          "as": {
            "type": "array",
            "items": {
              "type": "custom JSON Schema"
            }
          }
        },
        "additionalProperties": false
      })
    })

    it("refinement", () => {
      const schema = S.Int.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/Int",
        "$defs": {
          "Int": {
            "description": "an integer",
            "title": "Int",
            "type": "custom JSON Schema"
          }
        }
      })
    })

    it("transformation", () => {
      const schema = S.NumberFromString.pipe(S.jsonSchema({ "type": "custom JSON Schema" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/NumberFromString",
        "$defs": {
          "NumberFromString": {
            "type": "custom JSON Schema"
          }
        }
      })
    })
  })
})

export const decode = <A>(schema: JSONSchema.JsonSchema7Root): S.Schema<A> => S.make(decodeAST(schema, schema.$defs))

const emptyTypeLiteralAST = AST.TypeLiteral.make([], [])

const decodeAST = (
  schema: JSONSchema.JsonSchema7,
  $defs: JSONSchema.JsonSchema7Root["$defs"]
): AST.AST => {
  if ("$id" in schema) {
    switch (schema.$id) {
      case "/schemas/any":
        return AST.anyKeyword
      case "/schemas/unknown":
        return AST.unknownKeyword
      case "/schemas/object":
        return AST.objectKeyword
      case "/schemas/{}":
        return emptyTypeLiteralAST
    }
  } else if ("const" in schema) {
    return new AST.Literal(schema.const)
  } else if ("type" in schema) {
    const type = schema.type
    if (type === "string") {
      return AST.stringKeyword
    } else if (type === "number") {
      return AST.numberKeyword
    } else if (type === "integer") {
      return AST.numberKeyword
    } else if (type === "boolean") {
      return AST.booleanKeyword
    } else if (type === "array") {
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          const minItems = schema.minItems ?? -1
          const rest: AST.Tuple["rest"] = schema.additionalItems && !Predicate.isBoolean(schema.additionalItems)
            ? Option.some([decodeAST(schema.additionalItems, $defs)])
            : Option.none()
          return new AST.Tuple(
            schema.items.map((item, i) => new AST.Element(decodeAST(item, $defs), i >= minItems)),
            rest,
            true
          )
        } else {
          return new AST.Tuple([], Option.some([decodeAST(schema.items, $defs)]), true)
        }
      } else {
        return new AST.Tuple([], Option.none(), true)
      }
    } else if (type === "object") {
      const required = schema.required || []
      const propertySignatures: Array<AST.PropertySignature> = []
      const indexSignatures: Array<AST.IndexSignature> = []
      for (const name in schema.properties) {
        propertySignatures.push(
          new AST.PropertySignature(
            name,
            decodeAST(schema.properties[name], $defs),
            !required.includes(name),
            true
          )
        )
      }
      if (schema.additionalProperties && !Predicate.isBoolean(schema.additionalProperties)) {
        indexSignatures.push(
          AST.IndexSignature.make(
            AST.stringKeyword,
            decodeAST(schema.additionalProperties, $defs),
            true
          )
        )
      }
      if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
          indexSignatures.push(
            AST.IndexSignature.make(
              S.string.pipe(S.pattern(new RegExp(pattern))).ast,
              decodeAST(schema.patternProperties[pattern], $defs),
              true
            )
          )
        }
      }
      return AST.TypeLiteral.make(propertySignatures, indexSignatures)
    }
  } else if ("enum" in schema) {
    return AST.Union.make(schema.enum.map((literal) => new AST.Literal(literal)))
  } else if ("anyOf" in schema) {
    return AST.Union.make(schema.anyOf.map((s) => decodeAST(s, $defs)))
  } else if ("oneOf" in schema) {
    if ("$comment" in schema && schema.$comment === "/schemas/enums") {
      return new AST.Enums(schema.oneOf.map((e) => [e.title, e.const]))
    }
    return AST.Union.make(schema.oneOf.map((s) => decodeAST(s, $defs)))
  } else if ("$ref" in schema) {
    if ($defs) {
      const id = schema.$ref.substring(JSONSchema.DEFINITION_PREFIX.length)
      if (id in $defs) {
        return decodeAST($defs[id], $defs)
      }
    }
    throw new Error(`cannot find $ref: ${schema.$ref}`)
  }
  throw new Error(`cannot decode: ${JSON.stringify(schema, null, 2)}`)
}
