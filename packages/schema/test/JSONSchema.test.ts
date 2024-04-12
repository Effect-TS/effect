import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as S from "@effect/schema/Schema"
import AjvNonEsm from "ajv"
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

const doProperty = false

const propertyType = <A, I>(schema: S.Schema<A, I>, options?: {
  params?: fc.Parameters<[A]>
}) => {
  if (!doProperty) {
    return
  }
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
}

const JsonNumber = S.Number.pipe(
  S.filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    jsonSchema: { type: "number" }
  })
)

describe("JSONSchema", () => {
  it("declaration should raise an error", () => {
    const schema = S.Chunk(JsonNumber)
    expect(() => JSONSchema.make(schema)).toThrow(
      new Error("cannot build a JSON Schema for a declaration without a JSON Schema annotation")
    )
  })

  it("bigint should raise an error", () => {
    expect(() => JSONSchema.make(S.BigInt)).toThrow(
      new Error("cannot build a JSON Schema for `bigint` without a JSON Schema annotation")
    )
  })

  it("symbol should raise an error", () => {
    expect(() => JSONSchema.make(S.Symbol)).toThrow(
      new Error("cannot build a JSON Schema for `symbol` without a JSON Schema annotation")
    )
  })

  it("a unique symbol should raise an error", () => {
    expect(() => JSONSchema.make(S.UniqueSymbolFromSelf(Symbol.for("@effect/schema/test/a")))).toThrow(
      new Error("cannot build a JSON Schema for a unique symbol without a JSON Schema annotation")
    )
  })

  it("undefined should raise an error", () => {
    expect(() => JSONSchema.make(S.Undefined)).toThrow(
      new Error("cannot build a JSON Schema for `undefined` without a JSON Schema annotation")
    )
  })

  it("void should raise an error", () => {
    expect(() => JSONSchema.make(S.Void)).toThrow(
      new Error("cannot build a JSON Schema for `void` without a JSON Schema annotation")
    )
  })

  it("never should raise an error", () => {
    expect(() => JSONSchema.make(S.Never)).toThrow(
      new Error("cannot build a JSON Schema for `never` without a JSON Schema annotation")
    )
  })

  it("any", () => {
    propertyType(S.Any)
  })

  it("unknown", () => {
    propertyType(S.Unknown)
  })

  it("object", () => {
    const schema = S.Object
    const jsonSchema = JSONSchema.make(schema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
    propertyType(S.Object)
  })

  it("string", () => {
    propertyType(S.String)
  })

  it("JsonNumber", () => {
    propertyType(JsonNumber)
  })

  it("boolean", () => {
    propertyType(S.Boolean)
  })

  describe("literal", () => {
    it("null", () => {
      propertyType(S.Null)
    })

    it("string", () => {
      const schema = S.Literal("a")
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": "a"
      })
      propertyType(schema)
    })

    it("number", () => {
      const schema = S.Literal(1)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": 1
      })
      propertyType(schema)
    })

    it("boolean", () => {
      const schema = S.Literal(true)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": true
      })
      propertyType(S.Literal(true))
      propertyType(S.Literal(false))
    })

    it("bigint should raise an error", () => {
      expect(() => JSONSchema.make(S.Literal(1n))).toThrow(
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
      const schema = S.Enums(Fruits)
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
      propertyType(schema)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana"
      }
      const schema = S.Enums(Fruits)
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
      propertyType(schema)
    })

    it("String/Number enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.Enums(Fruits)
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
      propertyType(schema)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.Enums(Fruits)
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
      propertyType(schema)
    })
  })

  describe("unions", () => {
    it("string | number", () => {
      const schema = S.Union(S.String, JsonNumber)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          },
          {
            "type": "number",
            "description": "a number",
            "title": "number"
          }
        ]
      })
      propertyType(schema)
    })

    it(`1 | "a"`, () => {
      const schema = S.Literal(1, 2)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [1, 2]
      })
      propertyType(schema)
    })

    it(`1 | true | string`, () => {
      const schema = S.Union(S.Literal(1, true), S.String)
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          { "enum": [1, true] },
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          }
        ]
      })
      propertyType(schema)
    })

    it(`1 | true(with description) | string`, () => {
      const schema = S.Union(
        S.Literal(1),
        S.Literal(true).annotations({ description: "description" }),
        S.String
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
      propertyType(schema)
    })

    it(`1 | 2 | true(with description) | string`, () => {
      const schema = S.Union(
        S.Literal(1, 2),
        S.Literal(true).annotations({ description: "description" }),
        S.String
      )
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [
          { "enum": [1, 2] },
          { "const": true, "description": "description" },
          {
            "type": "string",
            "description": "a string",
            "title": "string"
          }
        ]
      })
      propertyType(schema)
    })

    it("union of literals with descriptions", () => {
      const schema = S.Union(
        S.Literal("foo").annotations({ description: "I'm a foo" }),
        S.Literal("bar").annotations({ description: "I'm a bar" })
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
      const schema = S.Union(
        S.Literal("foo").annotations({
          description: "I'm a foo",
          identifier: "foo"
        }),
        S.Literal("bar").annotations({
          description: "I'm a bar",
          identifier: "bar"
        })
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
      const schema = S.Tuple(S.optionalElement(JsonNumber))
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
      propertyType(schema)
    })

    it("e + e?", () => {
      const schema = S.Tuple(S.String, S.optionalElement(JsonNumber))
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
      propertyType(schema)
    })

    it("e? + r", () => {
      const schema = S.Tuple([S.optionalElement(S.String)], JsonNumber)
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
      propertyType(schema)
    })

    it("r + e should raise an error", () => {
      const schema = S.Tuple([], JsonNumber, S.String)
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error(
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("empty", () => {
      const schema = S.Tuple()
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
      const schema = S.Tuple(JsonNumber)
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
      propertyType(schema)
    })

    it("e + r", () => {
      const schema = S.Tuple([S.String], JsonNumber)
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
      propertyType(schema)
    })

    it("r", () => {
      const schema = S.Array(JsonNumber)
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
      propertyType(schema)
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.Struct({})
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
      propertyType(schema)
    })

    it("struct", () => {
      const schema = S.Struct({ a: S.String, b: JsonNumber })
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
      propertyType(schema)
    })

    it("optional property signature", () => {
      const schema = S.Struct({
        a: S.String,
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
      propertyType(schema)
    })

    it("should respect annotations", () => {
      const schema = S.Struct({
        a: S.optional(S.String).annotations({ description: "an optional string" })
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toStrictEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        type: "object",
        required: [],
        properties: {
          a: {
            type: "string",
            "description": "an optional string",
            title: "string"
          }
        },
        additionalProperties: false
      })
    })

    it("should raise an error if there is a property named with a symbol", () => {
      const a = Symbol.for("@effect/schema/test/a")
      expect(() => JSONSchema.make(S.Struct({ [a]: S.String }))).toThrow(
        new Error("cannot encode Symbol(@effect/schema/test/a) key to JSON Schema")
      )
    })

    it("should prune `UndefinedKeyword` if the property signature is marked as optional and contains a union that includes `UndefinedKeyword`", () => {
      const schema = S.Struct({
        a: S.optional(S.String)
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
          }
        },
        "required": [],
        "additionalProperties": false
      })
    })

    it("should raise an error if the property signature is not marked as optional and contains a union that includes `UndefinedKeyword`", () => {
      const schema = S.Struct({
        a: S.UndefinedOr(S.String)
      })
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error("cannot build a JSON Schema for `undefined` without a JSON Schema annotation")
      )
    })
  })

  describe("record", () => {
    it("record(symbol, number)", () => {
      expect(() => JSONSchema.make(S.Record(S.SymbolFromSelf, JsonNumber))).toThrow(
        new Error("Unsupported index signature parameter (symbol)")
      )
    })

    it("record(refinement, number)", () => {
      expect(() => JSONSchema.make(S.Record(S.String.pipe(S.minLength(1)), JsonNumber))).toThrow(
        new Error("Unsupported index signature parameter (a string at least 1 character(s) long)")
      )
    })

    it("record(string, number)", () => {
      const schema = S.Record(S.String, JsonNumber)
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
      propertyType(schema)
    })

    it("record('a' | 'b', number)", () => {
      const schema = S.Record(
        S.Union(S.Literal("a"), S.Literal("b")),
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
      propertyType(schema)
    })

    it("record(${string}-${string}, number)", () => {
      const schema = S.Record(
        S.TemplateLiteral(S.String, S.Literal("-"), S.String),
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
      propertyType(schema)
    })

    it("record(pattern, number)", () => {
      const schema = S.Record(
        S.String.pipe(S.pattern(new RegExp("^.*-.*$"))),
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
      propertyType(schema)
    })
  })

  it("struct + record", () => {
    const schema = S.Struct({ a: S.String }, S.Record(S.String, S.String))
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
    propertyType(schema)
  })

  describe("refinement", () => {
    it("should raise an error when an annotation doesn't exist", () => {
      const schema = S.String.pipe(S.filter(() => true))
      expect(() => JSONSchema.make(schema)).toThrow(
        new Error("cannot build a JSON Schema for a refinement without a JSON Schema annotation")
      )
    })

    it("minLength", () => {
      const schema = S.String.pipe(S.minLength(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
      propertyType(schema)
    })

    it("maxLength", () => {
      const schema = S.String.pipe(S.maxLength(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
      propertyType(schema)
    })

    it("length: number", () => {
      const schema = S.String.pipe(S.length(1))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
      propertyType(schema)
    })

    it("length: { min, max }", () => {
      const schema = S.String.pipe(S.length({ min: 2, max: 4 }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
      propertyType(schema)
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
      propertyType(schema)
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
      propertyType(schema)
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
      propertyType(schema)
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
      propertyType(schema)
    })

    it("pattern", () => {
      const schema = S.String.pipe(S.pattern(/^abb+$/))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
      propertyType(schema)
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
      propertyType(schema)
    })
  })

  it("TemplateLiteral", () => {
    const schema = S.TemplateLiteral(S.Literal("a"), S.Number)
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
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.Suspend(() => schema))
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
      const schema: S.Schema<A> = S.Suspend(() =>
        S.Struct({
          a: S.String,
          as: S.Array(schema)
        })
      ).annotations({ identifier: "A" })
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
      propertyType(schema)
    })

    it("should support inner suspended schemas with inner identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.Suspend(() => schema).annotations({ identifier: "A" }))
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
      propertyType(schema)
    })

    it("should support inner suspended schemas with outer identifier annotation", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const schema: S.Schema<Category> = S.Struct({
        name: S.String,
        categories: S.Array(S.Suspend(() => schema))
      }).annotations({ identifier: "Category" })
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
      propertyType(schema)
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

      const Expression: S.Schema<Expression> = S.Suspend(() =>
        S.Struct({
          type: S.Literal("expression"),
          value: S.Union(JsonNumber, Operation)
        })
      ).annotations({ identifier: "Expression" })

      const Operation: S.Schema<Operation> = S.Suspend(() =>
        S.Struct({
          type: S.Literal("operation"),
          operator: S.Union(S.Literal("+"), S.Literal("-")),
          left: Expression,
          right: Expression
        })
      ).annotations({ identifier: "Operation" })

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
                    "type": "number",
                    "description": "a number",
                    "title": "number"
                  },
                  {
                    "$ref": "#/$defs/Operation"
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
      propertyType(Operation, { params: { numRuns: 5 } })
    })

    it("should handle identifier annotations when generating a schema through `encodedSchema()`", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }

      const schema: S.Schema<Category> = S.Struct({
        name: S.String,
        categories: S.Array(S.Suspend(() => schema).annotations({ identifier: "Category" }))
      })
      const jsonSchema = JSONSchema.make(S.EncodedSchema(schema))
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
      const schema = S.String.annotations({ examples: ["a", "b"] })
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
      const schema = S.String.annotations({ default: "" })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "default": ""
      })
    })

    it("propertySignature", () => {
      const schema = S.Struct({
        foo: S.propertySignature(S.String).annotations({
          description: "foo description",
          title: "foo title",
          examples: ["foo example"]
        }),
        bar: S.propertySignature(JsonNumber).annotations({
          description: "bar description",
          title: "bar title",
          examples: [1]
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
              1
            ]
          }
        },
        "additionalProperties": false
      })
    })
  })

  describe("Class", () => {
    it("should support S.encodedSchema(Class)", () => {
      class A extends S.Class<A>("A")({ a: S.String }) {}
      const jsonSchema = JSONSchema.make(S.EncodedSchema(A))
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
        "additionalProperties": false,
        "title": "A (Encoded side)"
      })
    })
  })

  describe("identifier annotations support", () => {
    it("on root level schema", () => {
      const schema = S.String.annotations({ identifier: "Name" })
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
      const Name = S.String.annotations({
        identifier: "Name",
        description: "a name",
        title: "Name"
      })
      const schema = S.Struct({ a: Name, b: S.Struct({ c: Name }) })
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
      const schema = S.Void.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("never", () => {
      const schema = S.Never.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("literal", () => {
      const schema = S.Literal("a").annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("symbolFromSelf", () => {
      const schema = S.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("uniqueSymbolFromSelf", () => {
      const schema = S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
        jsonSchema: { "type": "custom JSON Schema" }
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("templateLiteral", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")).annotations({
        jsonSchema: { "type": "custom JSON Schema" }
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("undefined", () => {
      const schema = S.Undefined.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("unknown", () => {
      const schema = S.Unknown.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("any", () => {
      const schema = S.Any.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("object", () => {
      const schema = S.Object.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("string", () => {
      const schema = S.String.annotations({
        jsonSchema: { "type": "custom JSON Schema", "description": "description" }
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema",
        "description": "description"
      })
    })

    it("number", () => {
      const schema = S.Number.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("bigintFromSelf", () => {
      const schema = S.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("boolean", () => {
      const schema = S.Boolean.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.Enums(Fruits).annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("tuple", () => {
      const schema = S.Tuple(S.String, S.Number).annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("struct", () => {
      const schema = S.Struct({ a: S.String, b: S.Number }).annotations({
        jsonSchema: { "type": "custom JSON Schema" }
      })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("union", () => {
      const schema = S.Union(S.String, S.Number).annotations({ jsonSchema: { "type": "custom JSON Schema" } })
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
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.Suspend(() => schema).annotations({ jsonSchema: { "type": "custom JSON Schema" } }))
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
      const schema = S.Int.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "an integer",
        "title": "Int",
        "type": "custom JSON Schema"
      })
    })

    it("transformation", () => {
      const schema = S.NumberFromString.annotations({ jsonSchema: { "type": "custom JSON Schema" } })
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("refinement of a transformation", () => {
      const schema = S.Date.pipe(S.jsonSchema({ type: "string", format: "date-time" }))
      const jsonSchema = JSONSchema.make(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "a valid Date",
        "format": "date-time",
        "type": "string"
      })
    })
  })
})

export const decode = <A>(schema: JSONSchema.JsonSchema7Root): S.Schema<A> => S.make(decodeAST(schema, schema.$defs))

const emptyTypeLiteralAST = new AST.TypeLiteral([], [])

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
          const rest: AST.TupleType["rest"] = schema.additionalItems && !Predicate.isBoolean(schema.additionalItems)
            ? [decodeAST(schema.additionalItems, $defs)]
            : []
          return new AST.TupleType(
            schema.items.map((item, i) => new AST.Element(decodeAST(item, $defs), i >= minItems)),
            rest,
            true
          )
        } else {
          return new AST.TupleType([], [decodeAST(schema.items, $defs)], true)
        }
      } else {
        return new AST.TupleType([], [], true)
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
          new AST.IndexSignature(
            AST.stringKeyword,
            decodeAST(schema.additionalProperties, $defs),
            true
          )
        )
      }
      if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
          indexSignatures.push(
            new AST.IndexSignature(
              S.String.pipe(S.pattern(new RegExp(pattern))).ast,
              decodeAST(schema.patternProperties[pattern], $defs),
              true
            )
          )
        }
      }
      return new AST.TypeLiteral(propertySignatures, indexSignatures)
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
