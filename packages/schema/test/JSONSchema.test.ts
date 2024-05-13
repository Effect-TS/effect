import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as JSONSchema from "@effect/schema/JSONSchema"
import * as Schema from "@effect/schema/Schema"
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

const propertyType = <A, I>(schema: Schema.Schema<A, I>, options?: {
  params?: fc.Parameters<[A]>
}) => {
  if (!doProperty) {
    return
  }
  const arbitrary = A.makeLazy(schema)
  const is = Schema.is(schema)
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

const expectJSONSchema = <A, I>(schema: Schema.Schema<A, I>, expected: object) => {
  const jsonSchema = JSONSchema.make(schema)
  // console.log(JSON.stringify(jsonSchema, null, 2))
  expect(jsonSchema).toEqual(expected)
  propertyType(Schema.Null)
}

const expectError = <A, I>(schema: Schema.Schema<A, I>, message: string) => {
  expect(() => JSONSchema.make(schema)).toThrow(
    new Error(message)
  )
}

const JsonNumber = Schema.Number.pipe(
  Schema.filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    jsonSchema: { type: "number" }
  })
)

describe("JSONSchema", () => {
  describe("unsupported schemas", () => {
    it("a declaration should raise an error", () => {
      expectError(
        Schema.ChunkFromSelf(JsonNumber),
        "cannot build a JSON Schema for a declaration without a JSON Schema annotation"
      )
    })

    it("a bigint should raise an error", () => {
      expectError(Schema.BigIntFromSelf, "cannot build a JSON Schema for `bigint` without a JSON Schema annotation")
    })

    it("a symbol should raise an error", () => {
      expectError(Schema.SymbolFromSelf, "cannot build a JSON Schema for `symbol` without a JSON Schema annotation")
    })

    it("a unique symbol should raise an error", () => {
      expectError(
        Schema.UniqueSymbolFromSelf(Symbol.for("@effect/schema/test/a")),
        "cannot build a JSON Schema for a unique symbol without a JSON Schema annotation"
      )
    })

    it("Undefined should raise an error", () => {
      expectError(Schema.Undefined, "cannot build a JSON Schema for `undefined` without a JSON Schema annotation")
    })

    it("Void should raise an error", () => {
      expectError(Schema.Void, "cannot build a JSON Schema for `void` without a JSON Schema annotation")
    })

    it("Never should raise an error", () => {
      expectError(Schema.Never, "cannot build a JSON Schema for `never` without a JSON Schema annotation")
    })

    it("bigint literals should raise an error", () => {
      expectError(
        Schema.Literal(1n),
        "cannot build a JSON Schema for a bigint literal without a JSON Schema annotation"
      )
    })

    it("Tuple", () => {
      expectError(
        Schema.Tuple(Schema.Void),
        "cannot build a JSON Schema for `void` without a JSON Schema annotation (path [0])"
      )
    })

    it("Struct", () => {
      expectError(
        Schema.Struct({ a: Schema.Void }),
        `cannot build a JSON Schema for \`void\` without a JSON Schema annotation (path ["a"])`
      )
    })
  })

  it("Any", () => {
    expectJSONSchema(Schema.Any, {
      "$id": "/schemas/any",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "any"
    })
  })

  it("Unknown", () => {
    expectJSONSchema(Schema.Unknown, {
      "$id": "/schemas/unknown",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "unknown"
    })
  })

  it("Object", () => {
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "$ref": "#/$defs/object",
      "$defs": {
        object: {
          "$id": "/schemas/object",
          oneOf: [{ "type": "object" }, { "type": "array" }],
          description: "an object in the TypeScript meaning, i.e. the `object` type",
          title: "object"
        }
      }
    }
    expectJSONSchema(Schema.Object, jsonSchema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
  })

  it("String", () => {
    expectJSONSchema(Schema.String, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "string",
      description: "a string",
      title: "string"
    })
  })

  it("Number", () => {
    expectJSONSchema(Schema.Number, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "number",
      description: "a number",
      title: "number"
    })
  })

  it("Boolean", () => {
    expectJSONSchema(Schema.Boolean, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "boolean",
      description: "a boolean",
      title: "boolean"
    })
  })

  describe("Literal", () => {
    it("Null", () => {
      expectJSONSchema(Schema.Null, {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": "#/$defs/null",
        "$defs": { null: { const: null } }
      })
    })

    it("string literals", () => {
      expectJSONSchema(Schema.Literal("a"), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        const: "a"
      })
    })

    it("number literals", () => {
      expectJSONSchema(Schema.Literal(1), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        const: 1
      })
    })

    it("boolean literals", () => {
      expectJSONSchema(Schema.Literal(true), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        const: true
      })
      expectJSONSchema(Schema.Literal(false), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        const: false
      })
    })
  })

  describe("Enums", () => {
    it("numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchema(Schema.Enums(Fruits), {
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
    })

    it("string enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana"
      }
      expectJSONSchema(Schema.Enums(Fruits), {
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
    })

    it("mix of string/number enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      expectJSONSchema(Schema.Enums(Fruits), {
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
    })

    it("const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      expectJSONSchema(Schema.Enums(Fruits), {
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
    })
  })

  describe("Union", () => {
    it("string | number", () => {
      expectJSONSchema(Schema.Union(Schema.String, JsonNumber), {
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
    })

    it(`1 | "a"`, () => {
      expectJSONSchema(Schema.Literal(1, 2), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [1, 2]
      })
    })

    it(`1 | true | string`, () => {
      expectJSONSchema(Schema.Union(Schema.Literal(1, true), Schema.String), {
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
    })

    it(`1 | true(with description) | string`, () => {
      expectJSONSchema(
        Schema.Union(
          Schema.Literal(1),
          Schema.Literal(true).annotations({ description: "description" }),
          Schema.String
        ),
        {
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
        }
      )
    })

    it(`1 | 2 | true(with description) | string`, () => {
      expectJSONSchema(
        Schema.Union(
          Schema.Literal(1, 2),
          Schema.Literal(true).annotations({ description: "description" }),
          Schema.String
        ),
        {
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
        }
      )
    })

    it("union of literals with descriptions", () => {
      expectJSONSchema(
        Schema.Union(
          Schema.Literal("foo").annotations({ description: "I'm a foo" }),
          Schema.Literal("bar").annotations({ description: "I'm a bar" })
        ),
        {
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
        }
      )
    })

    it("union of literals with identifier", () => {
      expectJSONSchema(
        Schema.Union(
          Schema.Literal("foo").annotations({
            description: "I'm a foo",
            identifier: "foo"
          }),
          Schema.Literal("bar").annotations({
            description: "I'm a bar",
            identifier: "bar"
          })
        ),
        {
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
        }
      )
    })
  })

  describe("Tuple", () => {
    it("e?", () => {
      const schema = Schema.Tuple(Schema.optionalElement(JsonNumber))
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      propertyType(schema)
    })

    it("e + e?", () => {
      const schema = Schema.Tuple(Schema.String, Schema.optionalElement(JsonNumber))
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      propertyType(schema)
    })

    it("e? + r", () => {
      const schema = Schema.Tuple([Schema.optionalElement(Schema.String)], JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
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
      expectError(
        Schema.Tuple([], JsonNumber, Schema.String),
        "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
      )
    })

    it("empty", () => {
      const schema = Schema.Tuple()
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "maxItems": 0
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(false)
    })

    it("e", () => {
      const schema = Schema.Tuple(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [{
          "type": "number",
          "title": "number",
          "description": "a number"
        }],
        "minItems": 1,
        "additionalItems": false
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv().compile(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
      propertyType(schema)
    })

    it("e + r", () => {
      const schema = Schema.Tuple([Schema.String], JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
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
      const schema = Schema.Array(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": {
          "type": "number",
          "title": "number",
          "description": "a number"
        }
      }
      expectJSONSchema(schema, jsonSchema)
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

  describe("Struct", () => {
    it("empty", () => {
      const schema = Schema.Struct({})
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$id": "/schemas/{}",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "oneOf": [{
          "type": "object"
        }, {
          "type": "array"
        }]
      }
      expectJSONSchema(schema, jsonSchema)
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
      const schema = Schema.Struct({ a: Schema.String, b: JsonNumber })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyType(schema)
    })

    it("optional property signature", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: Schema.optional(JsonNumber, { exact: true })
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv().compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
      propertyType(schema)
    })

    it("should respect annotations", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.optional(Schema.String).annotations({ description: "an optional string" })
        }),
        {
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
        }
      )
    })

    it("should raise an error if there is a property named with a symbol", () => {
      const a = Symbol.for("@effect/schema/test/a")
      expectError(
        Schema.Struct({ [a]: Schema.String }),
        "cannot encode Symbol(@effect/schema/test/a) key to JSON Schema"
      )
    })

    it("should prune `UndefinedKeyword` if the property signature is marked as optional and contains a union that includes `UndefinedKeyword`", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.optional(Schema.String)
        }),
        {
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
        }
      )
    })

    it("should raise an error if the property signature is not marked as optional and contains a union that includes `UndefinedKeyword`", () => {
      expectError(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String)
        }),
        `cannot build a JSON Schema for \`undefined\` without a JSON Schema annotation (path ["a"])`
      )
    })
  })

  describe("Record", () => {
    it("Record(symbol, number)", () => {
      expectError(Schema.Record(Schema.SymbolFromSelf, JsonNumber), "unsupported index signature parameter (symbol)")
    })

    it("record(refinement, number)", () => {
      expectError(
        Schema.Record(Schema.String.pipe(Schema.minLength(1)), JsonNumber),
        "unsupported index signature parameter (a string at least 1 character(s) long)"
      )
    })

    it("Record(string, number)", () => {
      expectJSONSchema(Schema.Record(Schema.String, JsonNumber), {
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
    })

    it("Record('a' | 'b', number)", () => {
      expectJSONSchema(
        Schema.Record(
          Schema.Union(Schema.Literal("a"), Schema.Literal("b")),
          JsonNumber
        ),
        {
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
        }
      )
    })

    it("Record(${string}-${string}, number)", () => {
      const schema = Schema.Record(
        Schema.TemplateLiteral(Schema.String, Schema.Literal("-"), Schema.String),
        JsonNumber
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expect(jsonSchema).toStrictEqual(jsonSchema)
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

    it("Record(pattern, number)", () => {
      const schema = Schema.Record(
        Schema.String.pipe(Schema.pattern(new RegExp("^.*-.*$"))),
        JsonNumber
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expect(jsonSchema).toStrictEqual(jsonSchema)
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

  it("Struct + Record", () => {
    const schema = Schema.Struct({ a: Schema.String }, Schema.Record(Schema.String, Schema.String))
    const jsonSchema: JSONSchema.JsonSchema7Root = {
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
    }
    expect(jsonSchema).toStrictEqual(jsonSchema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate({ a: "a" })).toEqual(true)
    expect(validate({ a: "a", b: "b" })).toEqual(true)
    expect(validate({})).toEqual(false)
    expect(validate({ b: "b" })).toEqual(false)
    expect(validate({ a: 1 })).toEqual(false)
    expect(validate({ a: "a", b: 1 })).toEqual(false)
    propertyType(schema)
  })

  describe("refinements", () => {
    it("should raise an error when an annotation doesn't exist", () => {
      expectError(
        Schema.String.pipe(Schema.filter(() => true)),
        "cannot build a JSON Schema for a refinement without a JSON Schema annotation"
      )
    })

    it("minLength", () => {
      expectJSONSchema(Schema.String.pipe(Schema.minLength(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
    })

    it("maxLength", () => {
      expectJSONSchema(Schema.String.pipe(Schema.maxLength(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
    })

    it("length: number", () => {
      expectJSONSchema(Schema.String.pipe(Schema.length(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
    })

    it("length: { min, max }", () => {
      expectJSONSchema(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
    })

    it("greaterThan", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.greaterThan(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
    })

    it("greaterThanOrEqualTo", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
    })

    it("lessThan", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.lessThan(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
    })

    it("lessThanOrEqualTo", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.lessThanOrEqualTo(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "title": "number",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
    })

    it("pattern", () => {
      expectJSONSchema(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
    })

    it("integer", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.int()), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "integer",
        "title": "integer",
        "description": "an integer"
      })
    })
  })

  it("TemplateLiteral", () => {
    const schema = Schema.TemplateLiteral(Schema.Literal("a"), Schema.Number)
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "string",
      "pattern": "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$",
      "description": "a template literal"
    }
    expectJSONSchema(schema, jsonSchema)
    const validate = new Ajv().compile(jsonSchema)
    expect(validate("a1")).toEqual(true)
    expect(validate("a12")).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate("aa")).toEqual(false)
  })

  describe("suspend", () => {
    it("should raise an error if there is no identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend(() => schema))
      })
      expectError(
        schema,
        `Generating a JSON Schema for suspended schemas requires an identifier annotation (path ["as"])`
      )
    })

    it("should support outer suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.suspend(() =>
        Schema.Struct({
          a: Schema.String,
          as: Schema.Array(schema)
        })
      ).annotations({ identifier: "A" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
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
      const schema: Schema.Schema<A> = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend(() => schema).annotations({ identifier: "A" }))
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
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
      const schema: Schema.Schema<Category> = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(Schema.suspend(() => schema))
      }).annotations({ identifier: "Category" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(schema, jsonSchema)
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

      const Expression: Schema.Schema<Expression> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("expression"),
          value: Schema.Union(JsonNumber, Operation)
        })
      ).annotations({ identifier: "Expression" })

      const Operation: Schema.Schema<Operation> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("operation"),
          operator: Schema.Union(Schema.Literal("+"), Schema.Literal("-")),
          left: Expression,
          right: Expression
        })
      ).annotations({ identifier: "Operation" })

      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      }
      expectJSONSchema(Operation, jsonSchema)
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
  })

  describe("annotations", () => {
    it("examples support", () => {
      expectJSONSchema(Schema.String.annotations({ examples: ["a", "b"] }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "examples": ["a", "b"]
      })
    })

    it("default support", () => {
      expectJSONSchema(Schema.String.annotations({ default: "" }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "title": "string",
        "description": "a string",
        "default": ""
      })
    })

    it("propertySignature", () => {
      const schema = Schema.Struct({
        foo: Schema.propertySignature(Schema.String).annotations({
          description: "foo description",
          title: "foo title",
          examples: ["foo example"]
        }),
        bar: Schema.propertySignature(JsonNumber).annotations({
          description: "bar description",
          title: "bar title",
          examples: [1]
        })
      })
      expectJSONSchema(schema, {
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
    it("should support make(Class)", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
      expectJSONSchema(A, {
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

    it("should support make(S.typeSchema(Class))", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
      expectJSONSchema(A, {
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

    it("should support make(S.typeSchema(Class)) with custom annotation", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }, {
        jsonSchema: { "type": "custom JSON Schema" }
      }) {}
      expectJSONSchema(Schema.typeSchema(A), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("should support make(S.encodedSchema(Class))", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
      expectJSONSchema(Schema.encodedSchema(A), {
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
      expectJSONSchema(Schema.String.annotations({ identifier: "Name" }), {
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
      const Name = Schema.String.annotations({
        identifier: "Name",
        description: "a name",
        title: "Name"
      })
      const schema = Schema.Struct({ a: Name, b: Schema.Struct({ c: Name }) })
      expectJSONSchema(schema, {
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
    })

    it("should handle identifier annotations when generating a schema through `encodedSchema()`", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }

      const schema: Schema.Schema<Category> = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(Schema.suspend(() => schema).annotations({ identifier: "Category" }))
      })

      const jsonSchema = JSONSchema.make(Schema.encodedSchema(schema))
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

  describe("should handle jsonSchema annotations", () => {
    it("Void", () => {
      expectJSONSchema(Schema.Void.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Never", () => {
      expectJSONSchema(Schema.Never.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Literal", () => {
      expectJSONSchema(Schema.Literal("a").annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("SymbolFromSelf", () => {
      expectJSONSchema(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("UniqueSymbolFromSelf", () => {
      expectJSONSchema(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        }
      )
    })

    it("TemplateLiteral", () => {
      expectJSONSchema(
        Schema.TemplateLiteral(Schema.Literal("a"), Schema.String, Schema.Literal("b")).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        }
      )
    })

    it("Undefined", () => {
      expectJSONSchema(Schema.Undefined.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Unknown", () => {
      expectJSONSchema(Schema.Unknown.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Any", () => {
      expectJSONSchema(Schema.Any.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Object", () => {
      expectJSONSchema(Schema.Object.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("String", () => {
      expectJSONSchema(
        Schema.String.annotations({
          jsonSchema: { "type": "custom JSON Schema", "description": "description" }
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema",
          "description": "description"
        }
      )
    })

    it("Number", () => {
      expectJSONSchema(Schema.Number.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("BigintFromSelf", () => {
      expectJSONSchema(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Boolean", () => {
      expectJSONSchema(Schema.Boolean.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchema(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("Tuple", () => {
      expectJSONSchema(
        Schema.Tuple(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        }
      )
    })

    it("Struct", () => {
      expectJSONSchema(
        Schema.Struct({ a: Schema.String, b: JsonNumber }).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        }
      )
    })

    it("Union", () => {
      expectJSONSchema(
        Schema.Union(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        }
      )
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend(() => schema).annotations({ jsonSchema: { "type": "custom JSON Schema" } }))
      })

      expectJSONSchema(schema, {
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
      expectJSONSchema(Schema.Int.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "an integer",
        "title": "Int",
        "type": "custom JSON Schema"
      })
    })

    it("transformation", () => {
      expectJSONSchema(Schema.NumberFromString.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      })
    })

    it("refinement of a transformation", () => {
      expectJSONSchema(Schema.Date.pipe(Schema.jsonSchema({ type: "string", format: "date-time" })), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "format": "date-time",
        "type": "string"
      })
    })
  })

  describe("transformations", () => {
    it("should not handle identifiers", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.NumberFromString
        }),
        {
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
        }
      )
    })

    it("compose", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.NonEmpty.pipe(Schema.compose(Schema.NumberFromString))
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "type": "string",
              "description": "a non empty string",
              "title": "NonEmpty",
              "minLength": 1
            }
          },
          "additionalProperties": false
        }
      )
    })

    describe("optional", () => {
      it("annotations", () => {
        const schema = Schema.Struct({
          a: Schema.optional(Schema.NonEmpty.annotations({ description: "an optional field" }), { default: () => "" })
            .annotations({ description: "a required field" })
        })
        expectJSONSchema(schema, {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "an optional field",
              "title": "NonEmpty",
              "minLength": 1
            }
          },
          "additionalProperties": false,
          "title": "Struct (Encoded side)"
        })
        expectJSONSchema(Schema.typeSchema(schema), {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "type": "string",
              "description": "a required field",
              "title": "NonEmpty",
              "minLength": 1
            }
          },
          "additionalProperties": false,
          "title": "Struct (Type side)"
        })
        expectJSONSchema(Schema.encodedSchema(schema), {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [],
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

      it("with default", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.optional(Schema.NonEmpty, { default: () => "" })
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "type": "string",
                "description": "a non empty string",
                "title": "NonEmpty",
                "minLength": 1
              }
            },
            "additionalProperties": false,
            "title": "Struct (Encoded side)"
          }
        )
      })

      it("as Option", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.optional(Schema.NonEmpty, { as: "Option" })
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "type": "string",
                "description": "a non empty string",
                "title": "NonEmpty",
                "minLength": 1
              }
            },
            "additionalProperties": false,
            "title": "Struct (Encoded side)"
          }
        )
      })

      it("fromKey", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.NonEmpty.pipe(Schema.propertySignature, Schema.fromKey("b"))
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [
              "b"
            ],
            "properties": {
              "b": {
                "type": "string",
                "description": "a non empty string",
                "title": "NonEmpty",
                "minLength": 1
              }
            },
            "additionalProperties": false,
            "title": "Struct (Encoded side)"
          }
        )
      })

      it("OptionFromNullOr", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.OptionFromNullOr(Schema.NonEmpty)
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [
              "a"
            ],
            "properties": {
              "a": {
                "anyOf": [
                  {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmpty",
                    "minLength": 1
                  },
                  {
                    "$ref": "#/$defs/null"
                  }
                ]
              }
            },
            "additionalProperties": false,
            "$defs": {
              "null": {
                "const": null
              }
            }
          }
        )
      })
    })
  })
})

export const decode = <A>(schema: JSONSchema.JsonSchema7Root): Schema.Schema<A> =>
  Schema.make(decodeAST(schema, schema.$defs))

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
              Schema.String.pipe(Schema.pattern(new RegExp(pattern))).ast,
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
