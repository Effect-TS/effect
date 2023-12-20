import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as Schema from "@effect/schema/Schema"
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

const propertyTo = <I, A>(schema: Schema.Schema<I, A>, options?: {
  params?: fc.Parameters<[A]>
}) => {
  const arbitrary = A.to(schema)
  const is = Schema.is(schema)
  const jsonSchema = JSONSchema.to(schema)
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

const propertyFrom = <I, A>(schema: Schema.Schema<I, A>) => {
  const arbitrary = A.from(schema)
  const is = Schema.is(Schema.from(schema))
  const validate = new Ajv({ strictTuples: false, allowUnionTypes: true }).compile(
    JSONSchema.from(schema)
  )
  const arb = arbitrary(fc)
  fc.assert(fc.property(arb, (a) => {
    return is(a) && validate(a)
  }))
}

const JsonNumber = Schema.number.pipe(
  Schema.filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    jsonSchema: { type: "number" }
  })
)

describe("JSONSchema", () => {
  it("from", () => {
    propertyFrom(Schema.struct({ a: Schema.string, b: Schema.NumberFromString }))
  })

  it("declaration should raise an error", () => {
    const schema = Schema.chunk(JsonNumber)
    expect(() => JSONSchema.to(schema)).toThrow(
      new Error("cannot convert a declaration to JSON Schema")
    )
  })

  it("bigint should raise an error", () => {
    expect(() => JSONSchema.to(Schema.bigint)).toThrow(
      new Error("cannot convert `bigint` to JSON Schema")
    )
  })

  it("symbol should raise an error", () => {
    expect(() => JSONSchema.to(Schema.symbol)).toThrow(
      new Error("cannot convert `symbol` to JSON Schema")
    )
  })

  it("a unique symbol should raise an error", () => {
    expect(() => JSONSchema.to(Schema.uniqueSymbol(Symbol.for("@effect/schema/test/a")))).toThrow(
      new Error("cannot convert a unique symbol to JSON Schema")
    )
  })

  it("undefined should raise an error", () => {
    expect(() => JSONSchema.to(Schema.undefined)).toThrow(
      new Error("cannot convert `undefined` to JSON Schema")
    )
  })

  it("void should raise an error", () => {
    expect(() => JSONSchema.to(Schema.void)).toThrow(
      new Error("cannot convert `void` to JSON Schema")
    )
  })

  it("never should raise an error", () => {
    expect(() => JSONSchema.to(Schema.never)).toThrow(
      new Error("cannot convert `never` to JSON Schema")
    )
  })

  it("any", () => {
    propertyTo(Schema.any)
  })

  it("unknown", () => {
    propertyTo(Schema.unknown)
  })

  it("object", () => {
    const schema = Schema.object
    const jsonSchema = JSONSchema.to(schema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
    propertyTo(Schema.object)
  })

  it("string", () => {
    propertyTo(Schema.string)
  })

  it("JsonNumber", () => {
    propertyTo(JsonNumber)
  })

  it("boolean", () => {
    propertyTo(Schema.boolean)
  })

  describe("literal", () => {
    it("null", () => {
      propertyTo(Schema.null)
    })

    it("string", () => {
      const schema = Schema.literal("a")
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": "a"
      })
      propertyTo(schema)
    })

    it("number", () => {
      const schema = Schema.literal(1)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": 1
      })
      propertyTo(schema)
    })

    it("boolean", () => {
      const schema = Schema.literal(true)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "const": true
      })
      propertyTo(Schema.literal(true))
      propertyTo(Schema.literal(false))
    })

    it("bigint should raise an error", () => {
      expect(() => JSONSchema.to(Schema.literal(1n))).toThrow(
        new Error("cannot convert `bigint` to JSON Schema")
      )
    })
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = Schema.enums(Fruits)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.enums(Fruits)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.enums(Fruits)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.enums(Fruits)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.union(Schema.string, JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.literal(1, 2)
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [1, 2]
      })
      propertyTo(schema)
    })

    it(`1 | true | string`, () => {
      const schema = Schema.union(Schema.literal(1, true), Schema.string)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.union(
        Schema.literal(1),
        Schema.literal(true).pipe(Schema.description("description")),
        Schema.string
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.union(
        Schema.literal(1, 2),
        Schema.literal(true).pipe(Schema.description("description")),
        Schema.string
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.union(
        Schema.literal("foo").pipe(Schema.description("I'm a foo")),
        Schema.literal("bar").pipe(Schema.description("I'm a bar"))
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.union(
        Schema.literal("foo").pipe(Schema.description("I'm a foo"), Schema.identifier("foo")),
        Schema.literal("bar").pipe(Schema.description("I'm a bar"), Schema.identifier("bar"))
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.tuple().pipe(Schema.optionalElement(JsonNumber))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.tuple(Schema.string).pipe(Schema.optionalElement(JsonNumber))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.tuple().pipe(
        Schema.optionalElement(Schema.string),
        Schema.rest(JsonNumber)
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.array(JsonNumber).pipe(Schema.element(Schema.string))
      expect(() => JSONSchema.to(schema)).toThrow(
        new Error(
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
        )
      )
    })

    it("empty", () => {
      const schema = Schema.tuple()
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.tuple(JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.tuple(Schema.string).pipe(Schema.rest(JsonNumber))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.array(JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.struct({})
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.struct({ a: Schema.string, b: JsonNumber })
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.struct({
        a: Schema.string,
        b: Schema.optional(JsonNumber, { exact: true })
      })
      const jsonSchema = JSONSchema.to(schema)
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
      expect(() => JSONSchema.to(Schema.struct({ [a]: Schema.string }))).toThrow(
        new Error("Cannot encode Symbol(@effect/schema/test/a) key to JSON Schema")
      )
    })
  })

  describe("record", () => {
    it("record(symbol, number)", () => {
      expect(() => JSONSchema.to(Schema.record(Schema.symbolFromSelf, JsonNumber))).toThrow(
        new Error("Unsupported index signature parameter SymbolKeyword")
      )
    })

    it("record(refinement, number)", () => {
      expect(() =>
        JSONSchema.to(Schema.record(Schema.string.pipe(Schema.minLength(1)), JsonNumber))
      ).toThrow(
        new Error("Unsupported index signature parameter Refinement")
      )
    })

    it("record(string, number)", () => {
      const schema = Schema.record(Schema.string, JsonNumber)
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.record(
        Schema.union(Schema.literal("a"), Schema.literal("b")),
        JsonNumber
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.record(
        Schema.templateLiteral(Schema.string, Schema.literal("-"), Schema.string),
        JsonNumber
      )
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.record(
        Schema.string.pipe(Schema.pattern(new RegExp("^.*-.*$"))),
        JsonNumber
      )
      const jsonSchema = JSONSchema.to(schema)
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
    const schema = Schema.struct({ a: Schema.string }).pipe(
      Schema.extend(Schema.record(Schema.string, Schema.string))
    )
    const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.string.pipe(Schema.filter(() => true))
      expect(() => JSONSchema.to(schema)).toThrow(
        new Error("cannot build a JSON Schema for refinements without a JSON Schema annotation")
      )
    })

    it("minLength", () => {
      const schema = Schema.string.pipe(Schema.minLength(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.string.pipe(Schema.maxLength(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = JsonNumber.pipe(Schema.greaterThan(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = JsonNumber.pipe(Schema.greaterThanOrEqualTo(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = JsonNumber.pipe(Schema.lessThan(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = JsonNumber.pipe(Schema.lessThanOrEqualTo(1))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = Schema.string.pipe(Schema.pattern(/^abb+$/))
      const jsonSchema = JSONSchema.to(schema)
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
      const schema = JsonNumber.pipe(Schema.int())
      const jsonSchema = JSONSchema.to(schema)
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
    const schema = Schema.templateLiteral(Schema.literal("a"), Schema.number)
    const jsonSchema = JSONSchema.to(schema)
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
      const schema: Schema.Schema<A> = Schema.struct({
        a: Schema.string,
        as: Schema.array(Schema.suspend(() => schema))
      })
      expect(() => JSONSchema.to(schema)).toThrow(
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
      const schema: Schema.Schema<A> = Schema.suspend(() =>
        Schema.struct({
          a: Schema.string,
          as: Schema.array(schema)
        })
      ).pipe(Schema.identifier("A"))
      const jsonSchema = JSONSchema.to(schema)
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

    it("should support inner suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.struct({
        a: Schema.string,
        as: Schema.array(Schema.suspend(() => schema).pipe(Schema.identifier("A")))
      })
      const jsonSchema = JSONSchema.to(schema)
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

      const Expression: Schema.Schema<Expression> = Schema.suspend(() =>
        Schema.struct({
          type: Schema.literal("expression"),
          value: Schema.union(JsonNumber, Operation)
        })
      ).pipe(Schema.identifier("Expression"))

      const Operation: Schema.Schema<Operation> = Schema.suspend(() =>
        Schema.struct({
          type: Schema.literal("operation"),
          operator: Schema.union(Schema.literal("+"), Schema.literal("-")),
          left: Expression,
          right: Expression
        })
      ).pipe(Schema.identifier("Operation"))

      const jsonSchema = JSONSchema.to(Operation)
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

      const schema: Schema.Schema<Category> = Schema.struct({
        name: Schema.string,
        categories: Schema.array(Schema.suspend(() => schema).pipe(Schema.identifier("Category")))
      })
      const jsonSchema = JSONSchema.from(schema)
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

  it("Transform should raise an error", () => {
    expect(() => JSONSchema.goRoot(Schema.NumberFromString.ast)).toThrow(
      new Error("cannot build a JSON Schema for transformations")
    )
  })

  describe("annotations", () => {
    it("examples support", () => {
      const schema = Schema.string.pipe(Schema.examples(["a", "b"]))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "examples": ["a", "b"]
      })
    })

    it("default support", () => {
      const schema = Schema.string.pipe(Schema.default(""))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "default": ""
      })
    })

    it("struct properties support", () => {
      const schema = Schema.struct({
        foo: Schema.string.pipe(Schema.propertySignatureAnnotations({
          description: "foo description",
          title: "foo title",
          examples: ["foo example"]
        })),
        bar: JsonNumber.pipe(Schema.propertySignatureAnnotations({
          description: "bar description",
          title: "bar title",
          examples: ["bar example"]
        }))
      })
      const jsonSchema = JSONSchema.to(schema)
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

  it("should support Classes", () => {
    class A extends Schema.Class<A>()({ a: Schema.string }) {}
    const jsonSchema = JSONSchema.from(A)
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

  describe("identifier annotations support", () => {
    it("on root level schema", () => {
      const schema = Schema.string.pipe(Schema.identifier("Name"))
      const jsonSchema = JSONSchema.to(schema)
      expect(jsonSchema).toEqual({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "a string",
        "title": "string",
        "type": "string"
      })
    })

    it("on nested schemas", () => {
      const Name = Schema.string.pipe(
        Schema.identifier("Name"),
        Schema.description("a name"),
        Schema.title("Name")
      )
      const schema = Schema.struct({ a: Name, b: Schema.struct({ c: Name }) })
      const jsonSchema = JSONSchema.to(schema)
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
})

export const decode = <A>(schema: JSONSchema.JsonSchema7Root): Schema.Schema<A> =>
  Schema.make(decodeAST(schema, schema.$defs))

const emptyTypeLiteralAST = AST.createTypeLiteral([], [])

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
    return AST.createLiteral(schema.const)
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
          const rest: AST.Tuple["rest"] =
            schema.additionalItems && !Predicate.isBoolean(schema.additionalItems)
              ? Option.some([decodeAST(schema.additionalItems, $defs)])
              : Option.none()
          return AST.createTuple(
            schema.items.map((item, i) => AST.createElement(decodeAST(item, $defs), i >= minItems)),
            rest,
            true
          )
        } else {
          return AST.createTuple([], Option.some([decodeAST(schema.items, $defs)]), true)
        }
      } else {
        return AST.createTuple([], Option.none(), true)
      }
    } else if (type === "object") {
      const required = schema.required || []
      const propertySignatures: Array<AST.PropertySignature> = []
      const indexSignatures: Array<AST.IndexSignature> = []
      for (const name in schema.properties) {
        propertySignatures.push(
          AST.createPropertySignature(
            name,
            decodeAST(schema.properties[name], $defs),
            !required.includes(name),
            true
          )
        )
      }
      if (schema.additionalProperties && !Predicate.isBoolean(schema.additionalProperties)) {
        indexSignatures.push(
          AST.createIndexSignature(
            AST.stringKeyword,
            decodeAST(schema.additionalProperties, $defs),
            true
          )
        )
      }
      if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
          indexSignatures.push(
            AST.createIndexSignature(
              Schema.string.pipe(Schema.pattern(new RegExp(pattern))).ast,
              decodeAST(schema.patternProperties[pattern], $defs),
              true
            )
          )
        }
      }
      return AST.createTypeLiteral(propertySignatures, indexSignatures)
    }
  } else if ("enum" in schema) {
    return AST.createUnion(schema.enum.map((literal) => AST.createLiteral(literal)))
  } else if ("anyOf" in schema) {
    return AST.createUnion(schema.anyOf.map((s) => decodeAST(s, $defs)))
  } else if ("oneOf" in schema) {
    if ("$comment" in schema && schema.$comment === "/schemas/enums") {
      return AST.createEnums(schema.oneOf.map((e) => [e.title, e.const]))
    }
    return AST.createUnion(schema.oneOf.map((s) => decodeAST(s, $defs)))
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
