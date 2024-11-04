import AjvNonEsm from "ajv"
import * as A from "effect/Arbitrary"
import * as JSONSchema from "effect/JSONSchema"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
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

const ajvOptions = { strictTuples: false, allowMatchingProperties: true }

const propertyType = <A, I>(schema: Schema.Schema<A, I>, options?: {
  params?: fc.Parameters<[I]>
}) => {
  if (!doProperty) {
    return
  }
  const encodedBoundSchema = Schema.encodedBoundSchema(schema)
  const arb = A.makeLazy(encodedBoundSchema)
  const is = Schema.is(encodedBoundSchema)
  const jsonSchema = JSONSchema.make(schema)
  const validate = new Ajv(ajvOptions).compile(
    jsonSchema
  )
  fc.assert(
    fc.property(
      arb(fc),
      (i) => is(i) && validate(i)
    ),
    options?.params
  )
}

const expectJSONSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  options: boolean | {
    params?: fc.Parameters<[I]>
  } = true
) => {
  const jsonSchema = JSONSchema.make(schema)
  expect(jsonSchema).toEqual(expected)
  if (options !== false) {
    propertyType(schema, options === true ? undefined : options)
  }
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
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): Chunk<{ number | filter }>`
      )
    })

    it("a bigint should raise an error", () => {
      expectError(
        Schema.BigIntFromSelf,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (BigIntKeyword): bigint`
      )
    })

    it("a symbol should raise an error", () => {
      expectError(
        Schema.SymbolFromSelf,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
      )
    })

    it("a unique symbol should raise an error", () => {
      expectError(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UniqueSymbol): Symbol(effect/Schema/test/a)`
      )
    })

    it("Undefined should raise an error", () => {
      expectError(
        Schema.Undefined,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
      )
    })

    it("Never should raise an error", () => {
      expectError(
        Schema.Never,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (NeverKeyword): never`
      )
    })

    it("bigint literals should raise an error", () => {
      expectError(
        Schema.Literal(1n),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Literal): 1n`
      )
    })

    it("Tuple", () => {
      expectError(
        Schema.Tuple(Schema.DateFromSelf),
        `Missing annotation
at path: [0]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): DateFromSelf`
      )
    })

    it("Struct", () => {
      expectError(
        Schema.Struct({ a: Schema.DateFromSelf }),
        `Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): DateFromSelf`
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

  it("Void", () => {
    expectJSONSchema(Schema.Void, {
      "$id": "/schemas/void",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "void"
    })
    expectJSONSchema(Schema.Void.annotations({}), {
      "$id": "/schemas/void",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "void"
    })
  })

  it("Object", () => {
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "$id": "/schemas/object",
      "anyOf": [
        {
          "type": "object"
        },
        {
          "type": "array"
        }
      ],
      "description": "an object in the TypeScript meaning, i.e. the `object` type",
      "title": "object"
    }
    expectJSONSchema(Schema.Object, jsonSchema)
    const validate = new Ajv(ajvOptions).compile(jsonSchema)
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
      type: "string"
    })
    expectJSONSchema(Schema.String.annotations({}), {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "string"
    })
  })

  it("Number", () => {
    expectJSONSchema(Schema.Number, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "number"
    }, false)
    expectJSONSchema(Schema.Number.annotations({}), {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "number"
    }, false)
  })

  it("Boolean", () => {
    expectJSONSchema(Schema.Boolean, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "boolean"
    })
    expectJSONSchema(Schema.Boolean.annotations({}), {
      "$schema": "http://json-schema.org/draft-07/schema#",
      type: "boolean"
    })
  })

  it("NumberFromString", () => {
    expectJSONSchema(Schema.NumberFromString, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "string",
      "description": "a string that will be parsed into a number"
    }, false)
  })

  describe("Literal", () => {
    it("Null", () => {
      expectJSONSchema(Schema.Null, {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [null]
      })
    })

    it("string literals", () => {
      expectJSONSchema(Schema.Literal("a"), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": ["a"]
      })
    })

    it("number literals", () => {
      expectJSONSchema(Schema.Literal(1), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [1]
      })
    })

    it("boolean literals", () => {
      expectJSONSchema(Schema.Literal(true), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [true]
      })
      expectJSONSchema(Schema.Literal(false), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "enum": [false]
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
        "anyOf": [
          {
            "title": "Apple",
            "enum": [0]
          },
          {
            "title": "Banana",
            "enum": [1]
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
        "anyOf": [
          {
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "title": "Banana",
            "enum": ["banana"]
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
        "anyOf": [
          {
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "title": "Banana",
            "enum": ["banana"]
          },
          {
            "title": "Cantaloupe",
            "enum": [0]
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
        "anyOf": [
          {
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "title": "Banana",
            "enum": ["banana"]
          },
          {
            "title": "Cantaloupe",
            "enum": [3]
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
            "type": "string"
          },
          {
            "type": "number"
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
          {
            "type": "string"
          },
          { "enum": [1, true] }
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
            { "enum": [true], "description": "description" },
            {
              "type": "string"
            },
            { "enum": [1] }
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
            { "enum": [true], "description": "description" },
            {
              "type": "string"
            },
            { "enum": [1, 2] }
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
              "enum": ["foo"],
              "description": "I'm a foo"
            },
            {
              "enum": ["bar"],
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
              "enum": ["bar"],
              "description": "I'm a bar"
            },
            "foo": {
              "enum": ["foo"],
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
            "type": "number"
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
    })

    it("e e?", () => {
      const schema = Schema.Tuple(
        Schema.element(Schema.String.annotations({ description: "inner-e" })).annotations({ description: "e" }),
        Schema.optionalElement(JsonNumber.annotations({ description: "inner-e?" })).annotations({ description: "e?" })
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "minItems": 1,
        "items": [
          {
            "type": "string",
            "description": "e"
          },
          {
            "type": "number",
            "description": "e?"
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
    })

    it("e? r", () => {
      const schema = Schema.Tuple(
        [Schema.optionalElement(Schema.String)],
        Schema.element(JsonNumber.annotations({ description: "inner-r" })).annotations({ description: "r" })
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "string"
          }
        ],
        "additionalItems": {
          "type": "number",
          "description": "r"
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
    })

    it("r e should raise an error", () => {
      expectError(
        Schema.Tuple([], JsonNumber, Schema.String),
        "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request"
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
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(false)
    })

    it("e", () => {
      const schema = Schema.Tuple(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [{
          "type": "number"
        }],
        "minItems": 1,
        "additionalItems": false
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
    })

    it("e r", () => {
      const schema = Schema.Tuple([Schema.String], JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [{
          "type": "string"
        }],
        "minItems": 1,
        "additionalItems": {
          "type": "number"
        }
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": [
          {
            "type": "string"
          }
        ],
        "minItems": 1,
        "additionalItems": {
          "type": "number"
        }
      })
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate(["a", 1, 2])).toEqual(true)
      expect(validate(["a", 1, 2, 3])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate(["a", "b"])).toEqual(false)
    })

    it("r", () => {
      const schema = Schema.Array(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "array",
        "items": {
          "type": "number"
        }
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate([1, 2])).toEqual(true)
      expect(validate([1, 2, 3])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2, 3, "a"])).toEqual(false)
    })
  })

  describe("Struct", () => {
    it("empty", () => {
      const schema = Schema.Struct({})
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$id": "/schemas/{}",
        "$schema": "http://json-schema.org/draft-07/schema#",
        "anyOf": [{
          "type": "object"
        }, {
          "type": "array"
        }]
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ a: 1 })).toEqual(true)
      expect(validate([])).toEqual(true)
      expect(validate(null)).toEqual(false)
      expect(validate(1)).toEqual(false)
      expect(validate(true)).toEqual(false)
    })

    it("struct", () => {
      const schema = Schema.Struct({ a: Schema.String, b: JsonNumber })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
    })

    it("exact optional property signature", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: Schema.optionalWith(JsonNumber, { exact: true })
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a"],
        "additionalProperties": false
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
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
              "description": "an optional string"
            }
          },
          additionalProperties: false
        }
      )
    })

    it("should raise an error if there is a property named with a symbol", () => {
      const a = Symbol.for("effect/Schema/test/a")
      expectError(
        Schema.Struct({ [a]: Schema.String }),
        `Unsupported key
details: Cannot encode Symbol(effect/Schema/test/a) key to JSON Schema`
      )
    })

    describe("pruning undefined", () => {
      it("with an annotation the property should remain required", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.UndefinedOr(Schema.String).annotations({ jsonSchema: { "type": "number" } })
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "number"
              }
            },
            "additionalProperties": false
          },
          false
        )
      })

      it("should prune `UndefinedKeyword` from an optional property signature", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.optional(Schema.String)
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "required": [],
            "additionalProperties": false
          }
        )
      })

      describe("should prune `UndefinedKeyword` from a required property signature type and make the property optional by default", () => {
        it("Struct", () => {
          expectJSONSchema(
            Schema.Struct({
              a: Schema.UndefinedOr(Schema.String)
            }),
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "type": "object",
              "required": [],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          )
        })

        it("Transformation", () => {
          expectJSONSchema(
            Schema.Struct({
              a: Schema.OptionFromUndefinedOr(Schema.String)
            }),
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "type": "object",
              "required": [],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          )
        })

        it("parseJson Transformation", () => {
          expectJSONSchema(
            Schema.Struct({
              a: Schema.parseJson(Schema.OptionFromUndefinedOr(Schema.String))
            }),
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "type": "object",
              "required": [],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          )
        })
      })
    })
  })

  describe("Record", () => {
    it("Record(symbol, number)", () => {
      expectError(
        Schema.Record({ key: Schema.SymbolFromSelf, value: JsonNumber }),
        `Unsupported index signature parameter
schema (SymbolKeyword): symbol`
      )
    })

    it("record(refinement, number)", () => {
      expectJSONSchema(
        Schema.Record({ key: Schema.String.pipe(Schema.minLength(1)), value: JsonNumber }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          type: "object",
          required: [],
          properties: {},
          patternProperties: {
            "": {
              type: "number"
            }
          },
          propertyNames: {
            type: "string",
            description: "a string at least 1 character(s) long",
            minLength: 1
          }
        }
      )
    })

    it("Record(string, number)", () => {
      expectJSONSchema(Schema.Record({ key: Schema.String, value: JsonNumber }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {},
        "required": [],
        "patternProperties": {
          "": {
            "type": "number"
          }
        }
      })
    })

    it("Record('a' | 'b', number)", () => {
      expectJSONSchema(
        Schema.Record(
          { key: Schema.Union(Schema.Literal("a"), Schema.Literal("b")), value: JsonNumber }
        ),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "a": {
              "type": "number"
            },
            "b": {
              "type": "number"
            }
          },
          "required": ["a", "b"],
          "additionalProperties": false
        }
      )
    })

    it("Record(${string}-${string}, number)", () => {
      const schema = Schema.Record(
        { key: Schema.TemplateLiteral(Schema.String, Schema.Literal("-"), Schema.String), value: JsonNumber }
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": { type: "number" }
        },
        "propertyNames": {
          "pattern": "^.*-.*$",
          "type": "string"
        }
      }
      expectJSONSchema(schema, jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ "-": 1 })).toEqual(true)
      expect(validate({ "a-": 1 })).toEqual(true)
      expect(validate({ "-b": 1 })).toEqual(true)
      expect(validate({ "a-b": 1 })).toEqual(true)
      expect(validate({ "": 1 })).toEqual(false)
      expect(validate({ "-": "a" })).toEqual(false)
    })

    it("Record(pattern, number)", () => {
      const schema = Schema.Record(
        { key: Schema.String.pipe(Schema.pattern(new RegExp("^.*-.*$"))), value: JsonNumber }
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": {
            "type": "number"
          }
        },
        "propertyNames": {
          "description": "a string matching the pattern ^.*-.*$",
          "pattern": "^.*-.*$",
          "type": "string"
        }
      }
      expectJSONSchema(schema, jsonSchema)
      expect(jsonSchema).toStrictEqual(jsonSchema)
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ "-": 1 })).toEqual(true)
      expect(validate({ "a-": 1 })).toEqual(true)
      expect(validate({ "-b": 1 })).toEqual(true)
      expect(validate({ "a-b": 1 })).toEqual(true)
      expect(validate({ "": 1 })).toEqual(false)
      expect(validate({ "-": "a" })).toEqual(false)
    })
  })

  it("Struct Record", () => {
    const schema = Schema.Struct({ a: Schema.String }, Schema.Record({ key: Schema.String, value: Schema.String }))
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "required": [
        "a"
      ],
      "properties": {
        "a": {
          "type": "string"
        }
      },
      "patternProperties": {
        "": {
          "type": "string"
        }
      }
    }
    expectJSONSchema(schema, jsonSchema)
    const validate = new Ajv(ajvOptions).compile(jsonSchema)
    expect(validate({ a: "a" })).toEqual(true)
    expect(validate({ a: "a", b: "b" })).toEqual(true)
    expect(validate({})).toEqual(false)
    expect(validate({ b: "b" })).toEqual(false)
    expect(validate({ a: 1 })).toEqual(false)
    expect(validate({ a: "a", b: 1 })).toEqual(false)
  })

  describe("refinements", () => {
    it("should raise an error when an annotation doesn't exist", () => {
      expectError(
        Schema.String.pipe(Schema.filter(() => true)),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Refinement): { string | filter }`
      )
    })

    it("minLength", () => {
      expectJSONSchema(Schema.String.pipe(Schema.minLength(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
    })

    it("maxLength", () => {
      expectJSONSchema(Schema.String.pipe(Schema.maxLength(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
    })

    it("length: number", () => {
      expectJSONSchema(Schema.String.pipe(Schema.length(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
    })

    it("length: { min, max }", () => {
      expectJSONSchema(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
    })

    it("greaterThan", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.greaterThan(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
    })

    it("greaterThanOrEqualTo", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
    })

    it("lessThan", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.lessThan(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
    })

    it("lessThanOrEqualTo", () => {
      expectJSONSchema(JsonNumber.pipe(Schema.lessThanOrEqualTo(1)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "number",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
    })

    it("pattern", () => {
      expectJSONSchema(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
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

    it("Trimmed", () => {
      const schema = Schema.Trimmed
      expectJSONSchema(schema, {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "a string with no leading or trailing whitespace",
        "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
        "title": "Trimmed",
        "type": "string"
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
    const validate = new Ajv(ajvOptions).compile(jsonSchema)
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
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend((): Schema.Schema<A> => schema))
      })
      expectError(
        schema,
        `Missing annotation
at path: ["as"]
details: Generating a JSON Schema for this schema requires an "identifier" annotation
schema (Suspend): <suspended schema>`
      )
    })

    it("should support outer suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.suspend(() =>
        // intended outer suspend
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
                "type": "string"
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
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({ a: "a1", as: [] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] })).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      ).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      ).toEqual(false)
    })

    it("should support inner suspended schemas with inner identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend((): Schema.Schema<A> => schema).annotations({ identifier: "A" }))
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
            "type": "string"
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
                "type": "string"
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
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
      expect(validate({ a: "a1", as: [] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(true)
      expect(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] })).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      ).toEqual(true)
      expect(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      ).toEqual(false)
    })

    it("should support inner suspended schemas with outer identifier annotation", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const schema = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(Schema.suspend((): Schema.Schema<Category> => schema))
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
                "type": "string"
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
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
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

      // intended outer suspend
      const Expression: Schema.Schema<Expression> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("expression"),
          value: Schema.Union(JsonNumber, Operation)
        })
      ).annotations({ identifier: "Expression" })

      // intended outer suspend
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
                "enum": ["operation"]
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
                "enum": ["expression"]
              },
              "value": {
                "anyOf": [
                  {
                    "type": "number"
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
      expectJSONSchema(Operation, jsonSchema, { params: { numRuns: 5 } })
      const validate = new Ajv(ajvOptions).compile(jsonSchema)
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
    })
  })

  describe("annotations", () => {
    it("examples support", () => {
      expectJSONSchema(Schema.String.annotations({ examples: ["a", "b"] }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "examples": ["a", "b"]
      })
    })

    it("default support", () => {
      expectJSONSchema(Schema.String.annotations({ default: "" }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
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
            "type": "string"
          }
        },
        "additionalProperties": false
      })
    })

    it("should support make(S.typeSchema(Class))", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
      expectJSONSchema(Schema.typeSchema(A), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "title": "A (Type side)",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "type": "string"
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
      }, false)
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
            "type": "string"
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
            "type": "string"
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
            "type": "string"
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
                "type": "string"
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
      }, false)
    })

    it("Never", () => {
      expectJSONSchema(Schema.Never.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Literal", () => {
      expectJSONSchema(Schema.Literal("a").annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("SymbolFromSelf", () => {
      expectJSONSchema(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("UniqueSymbolFromSelf", () => {
      expectJSONSchema(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        },
        false
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
        },
        false
      )
    })

    it("Undefined", () => {
      expectJSONSchema(Schema.Undefined.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Unknown", () => {
      expectJSONSchema(Schema.Unknown.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Any", () => {
      expectJSONSchema(Schema.Any.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Object", () => {
      expectJSONSchema(Schema.Object.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
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
        },
        false
      )
    })

    it("Number", () => {
      expectJSONSchema(Schema.Number.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("BigintFromSelf", () => {
      expectJSONSchema(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Boolean", () => {
      expectJSONSchema(Schema.Boolean.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchema(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("Tuple", () => {
      expectJSONSchema(
        Schema.Tuple(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        },
        false
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
        },
        false
      )
    })

    it("struct and class", () => {
      expectJSONSchema(
        Schema.Struct({ a: Schema.String, b: JsonNumber }).annotations({
          identifier: "test",
          title: "Test"
        }),
        {
          "$defs": {
            "test": {
              "additionalProperties": false,
              "properties": {
                "a": {
                  "type": "string"
                },
                "b": {
                  "type": "number"
                }
              },
              "required": [
                "a",
                "b"
              ],
              "type": "object",
              "title": "Test"
            }
          },
          "$ref": "#/$defs/test",
          "$schema": "http://json-schema.org/draft-07/schema#"
        },
        false
      )
      expectJSONSchema(
        Schema.Struct({ a: Schema.String, b: Schema.optionalWith(JsonNumber, { default: () => 1 }) }).annotations({
          identifier: "test",
          title: "Test"
        }),
        {
          "$defs": {
            "test": {
              "additionalProperties": false,
              "properties": {
                "a": {
                  "type": "string"
                },
                "b": {
                  "type": "number"
                }
              },
              "required": [
                "a"
              ],
              "title": "Test",
              "type": "object"
            }
          },
          "$ref": "#/$defs/test",
          "$schema": "http://json-schema.org/draft-07/schema#"
        }
      )
      expectJSONSchema(
        class A extends Schema.Class<A>("A")({ a: Schema.String, b: JsonNumber }, {
          identifier: "test",
          title: "Test"
        }) {},
        {
          "$defs": {
            "test": {
              "additionalProperties": false,
              "properties": {
                "a": {
                  "type": "string"
                },
                "b": {
                  "type": "number"
                }
              },
              "required": [
                "a",
                "b"
              ],
              "title": "Test",
              "type": "object"
            }
          },
          "$ref": "#/$defs/test",
          "$schema": "http://json-schema.org/draft-07/schema#"
        },
        false
      )
      expectJSONSchema(
        class A
          extends Schema.Class<A>("A")({ a: Schema.String, b: Schema.optionalWith(JsonNumber, { default: () => 1 }) })
            .annotations({
              identifier: "test",
              title: "Test"
            })
        {},
        {
          "$defs": {
            "test": {
              "additionalProperties": false,
              "properties": {
                "a": {
                  "type": "string"
                },
                "b": {
                  "type": "number"
                }
              },
              "required": [
                "a"
              ],
              "title": "Test",
              "type": "object"
            }
          },
          "$ref": "#/$defs/test",
          "$schema": "http://json-schema.org/draft-07/schema#"
        }
      )
    })

    it("Union", () => {
      expectJSONSchema(
        Schema.Union(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "custom JSON Schema"
        },
        false
      )
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(
          Schema.suspend((): Schema.Schema<A> => schema).annotations({ jsonSchema: { "type": "custom JSON Schema" } })
        )
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
            "type": "string"
          },
          "as": {
            "type": "array",
            "items": {
              "type": "custom JSON Schema"
            }
          }
        },
        "additionalProperties": false
      }, false)
    })

    it("refinement", () => {
      expectJSONSchema(Schema.Int.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "an integer",
        "title": "Int",
        "type": "custom JSON Schema"
      }, false)
    })

    it("transformation", () => {
      expectJSONSchema(Schema.NumberFromString.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "custom JSON Schema"
      }, false)
    })

    it("refinement of a transformation with an override annotation", () => {
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { type: "string", format: "date-time" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "format": "date-time",
        "type": "string"
      }, false)
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        { "$schema": "http://json-schema.org/draft-07/schema#", anyOf: [{ type: "object" }, { type: "array" }] },
        false
      )
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        { "$schema": "http://json-schema.org/draft-07/schema#", anyOf: [{ type: "object" }, { type: "array" }] },
        false
      )
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { $ref: "x" } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        $ref: "x"
      }, false)
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { const: 1 } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        const: 1
      }, false)
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { enum: [1] } }), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        enum: [1]
      }, false)
    })

    it("refinement of a transformation without an override annotation", () => {
      expectJSONSchema(Schema.Trim.pipe(Schema.nonEmptyString()), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string that will be trimmed"
      }, false)
      expectJSONSchema(Schema.Trim.pipe(Schema.nonEmptyString({ jsonSchema: { title: "Description" } })), {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string that will be trimmed"
      }, false)
      expectJSONSchema(
        Schema.Trim.pipe(Schema.nonEmptyString()).annotations({ jsonSchema: { title: "Description" } }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "string",
          "description": "a string that will be trimmed"
        },
        false
      )
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
              "description": "a string that will be parsed into a number"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("compose", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.NonEmptyString.pipe(Schema.compose(Schema.NumberFromString))
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
              "title": "NonEmptyString",
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
          a: Schema.optionalWith(Schema.NonEmptyString.annotations({ description: "an optional field" }), {
            default: () => ""
          })
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
              "title": "NonEmptyString",
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
              "title": "NonEmptyString",
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
              "type": "string"
            }
          },
          "additionalProperties": false
        })
      })

      it("with default", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "type": "string",
                "description": "a non empty string",
                "title": "NonEmptyString",
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
            a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "type": "string",
                "description": "a non empty string",
                "title": "NonEmptyString",
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
            a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
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
                "title": "NonEmptyString",
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
            a: Schema.OptionFromNullOr(Schema.NonEmptyString)
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
                    "title": "NonEmptyString",
                    "minLength": 1
                  },
                  {
                    "enum": [null]
                  }
                ]
              }
            },
            "additionalProperties": false
          }
        )
      })
    })
  })

  it(`should correctly generate JSON Schemas by targeting the "to" side of transformations from S.parseJson`, () => {
    expectJSONSchema(
      // Define a schema that parses a JSON string into a structured object
      Schema.parseJson(Schema.Struct({
        a: Schema.parseJson(Schema.NumberFromString) // Nested parsing from JSON string to number
      })),
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        type: "object",
        required: ["a"],
        properties: {
          a: {
            "type": "string",
            "description": "a string that will be parsed into a number"
          }
        },
        additionalProperties: false
      },
      false
    )
  })

  it("should correctly generate JSON Schemas for a schema created by extending two refinements using the `extend` API", () => {
    expectJSONSchema(
      Schema.Struct({
        a: Schema.String
      }).pipe(Schema.filter(() => true, { jsonSchema: { description: "a" } })).pipe(Schema.extend(
        Schema.Struct({
          b: JsonNumber
        }).pipe(Schema.filter(() => true, { jsonSchema: { title: "b" } }))
      )),
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        type: "object",
        required: ["a", "b"],
        properties: {
          a: { type: "string" },
          b: { type: "number" }
        },
        additionalProperties: false,
        description: "a",
        title: "b"
      }
    )
  })

  it("ReadonlyMapFromRecord", () => {
    expectJSONSchema(
      Schema.ReadonlyMapFromRecord({
        key: Schema.String.pipe(Schema.minLength(2)),
        value: Schema.NumberFromString
      }),
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "description": "a record that will be parsed into a ReadonlyMap",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": {
            "type": "string",
            "description": "a string that will be parsed into a number"
          }
        },
        "propertyNames": {
          "description": "a string at least 2 character(s) long",
          "minLength": 2,
          "type": "string"
        }
      }
    )
  })

  it("MapFromRecord", () => {
    expectJSONSchema(
      Schema.MapFromRecord({
        key: Schema.String.pipe(Schema.minLength(2)),
        value: Schema.NumberFromString
      }),
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "description": "a record that will be parsed into a Map",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": {
            "type": "string",
            "description": "a string that will be parsed into a number"
          }
        },
        "propertyNames": {
          "description": "a string at least 2 character(s) long",
          "minLength": 2,
          "type": "string"
        }
      }
    )
  })

  it("NonEmptyArray", () => {
    expectJSONSchema(
      Schema.NonEmptyArray(Schema.String),
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        type: "array",
        minItems: 1,
        items: { type: "string" }
      }
    )
  })

  it("DateFromString", () => {
    expectJSONSchema(
      Schema.DateFromString,
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string that will be parsed into a Date"
      }
    )
  })

  it("Date", () => {
    expectJSONSchema(
      Schema.Date,
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "string",
        "description": "a string that will be parsed into a Date"
      }
    )
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
            ? [new AST.Type(decodeAST(schema.additionalItems, $defs))]
            : []
          return new AST.TupleType(
            schema.items.map((item, i) => new AST.OptionalType(decodeAST(item, $defs), i >= minItems)),
            rest,
            true
          )
        } else {
          return new AST.TupleType([], [new AST.Type(decodeAST(schema.items, $defs))], true)
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
    if ("$comment" in schema && schema.$comment === "/schemas/enums") {
      return new AST.Enums(schema.anyOf.map((e) => [e.title, e.enum[0]]))
    }
    return AST.Union.make(schema.anyOf.map((s) => decodeAST(s, $defs)))
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
