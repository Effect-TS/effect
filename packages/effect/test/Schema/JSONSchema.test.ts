import Ajv from "ajv"
import * as A from "effect/Arbitrary"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const ajvOptions: Ajv.Options = {
  strictTuples: false,
  allowMatchingProperties: true
}

const getAjvValidate = (jsonSchema: JSONSchema.JsonSchema7Root): Ajv.ValidateFunction =>
  // new instance of Ajv is created for each schema to avoid error: "schema with key or id "/schemas/any" already exists"
  new Ajv.default(ajvOptions).compile(jsonSchema)

const expectProperty = <A, I>(
  schema: Schema.Schema<A, I>,
  jsonSchema: JSONSchema.JsonSchema7,
  params?: fc.Parameters<[I]>
) => {
  if (false as boolean) {
    const encodedBoundSchema = Schema.encodedBoundSchema(schema)
    const arb = A.make(encodedBoundSchema)
    const is = Schema.is(encodedBoundSchema)
    const validate = getAjvValidate(jsonSchema)
    fc.assert(fc.property(arb, (i) => is(i) && validate(i)), params)
  }
}

const expectJSONSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object
) => {
  const jsonSchema = JSONSchema.make(schema)
  expect(jsonSchema).toStrictEqual({
    "$schema": "http://json-schema.org/draft-07/schema#",
    ...expected
  })
  return jsonSchema
}

const expectJSONSchemaProperty = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  params?: fc.Parameters<[I]>
) => {
  const jsonSchema = expectJSONSchema(schema, expected)
  expectProperty(schema, jsonSchema, params)
}

const expectJsonSchemaAnnotations = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  params?: fc.Parameters<[I]>
) => {
  expectJSONSchemaProperty(schema, expected, params)
  const jsonSchemaAnnotations = {
    description: "269d3e58-8fb2-43cb-a389-8146c353fdd5",
    title: "5401c637-61f2-49b8-b74d-17f058c2670f"
  }
  expectJSONSchemaProperty(schema.annotations(jsonSchemaAnnotations), { ...expected, ...jsonSchemaAnnotations }, params)
}

const expectError = <A, I>(schema: Schema.Schema<A, I>, message: string) => {
  expect(() => JSONSchema.make(schema)).toThrow(new Error(message))
}

// Using this instead of Schema.JsonNumber to avoid cluttering the output with unnecessary description and title
const JsonNumber = Schema.Number.pipe(Schema.filter((n) => Number.isFinite(n), { jsonSchema: {} }))

describe("JSONSchema", () => {
  describe("Unsupported schemas", () => {
    describe("Missing jsonSchema annotation Error", () => {
      it("Declaration", () => {
        expectError(
          Schema.ChunkFromSelf(JsonNumber),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): Chunk<{ number | filter }>`
        )
      })

      it("BigIntFromSelf", () => {
        expectError(
          Schema.BigIntFromSelf,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (BigIntKeyword): bigint`
        )
      })

      it("SymbolFromSelf", () => {
        expectError(
          Schema.SymbolFromSelf,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
        )
      })

      it("UniqueSymbolFromSelf", () => {
        expectError(
          Schema.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UniqueSymbol): Symbol(effect/Schema/test/a)`
        )
      })

      it("Undefined", () => {
        expectError(
          Schema.Undefined,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
        )
      })

      it("Never", () => {
        expectError(
          Schema.Never,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (NeverKeyword): never`
        )
      })

      it("Schema.Literal with a bigint literal", () => {
        expectError(
          Schema.Literal(1n),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Literal): 1n`
        )
      })

      it("Tuple with an unsupported component", () => {
        expectError(
          Schema.Tuple(Schema.Undefined),
          `Missing annotation
at path: [0]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
        )
      })

      it("Struct with an unsupported field", () => {
        expectError(
          Schema.Struct({ a: Schema.Undefined }),
          `Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
        )
      })

      it("Refinement", () => {
        expectError(
          Schema.String.pipe(Schema.filter(() => true)),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Refinement): { string | filter }`
        )
      })
    })

    describe("Missing identifier annotation Error", () => {
      it("Suspend", () => {
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
    })

    describe("Unsupported index signature parameter", () => {
      it("Record(symbol, number)", () => {
        expectError(
          Schema.Record({ key: Schema.SymbolFromSelf, value: JsonNumber }),
          `Unsupported index signature parameter
schema (SymbolKeyword): symbol`
        )
      })
    })

    describe("Unsupported key", () => {
      it("should raise an error if there is a property named with a symbol", () => {
        const a = Symbol.for("effect/Schema/test/a")
        expectError(
          Schema.Struct({ [a]: Schema.String }),
          `Unsupported key
details: Cannot encode Symbol(effect/Schema/test/a) key to JSON Schema`
        )
      })
    })

    describe("Unsupported post-rest elements", () => {
      it("r e should raise an error", () => {
        expectError(
          Schema.Tuple([], JsonNumber, Schema.String),
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request"
        )
      })
    })
  })

  it("Any", () => {
    expectJsonSchemaAnnotations(Schema.Any, {
      "$id": "/schemas/any",
      "title": "any"
    })
  })

  it("Unknown", () => {
    expectJsonSchemaAnnotations(Schema.Unknown, {
      "$id": "/schemas/unknown",
      "title": "unknown"
    })
  })

  it("Object", () => {
    const jsonSchema: JSONSchema.JsonSchema7Root = {
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
    expectJsonSchemaAnnotations(Schema.Object, jsonSchema)

    const validate = getAjvValidate(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
  })

  it("empty struct: Schema.Struct({})", () => {
    const schema = Schema.Struct({})
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "$id": "/schemas/{}",

      "anyOf": [{
        "type": "object"
      }, {
        "type": "array"
      }]
    }
    expectJsonSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate(null)).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
  })

  it("Void", () => {
    expectJsonSchemaAnnotations(Schema.Void, {
      "$id": "/schemas/void",
      "title": "void"
    })
  })

  it("String", () => {
    expectJsonSchemaAnnotations(Schema.String, {
      "type": "string"
    })
  })

  it("Number", () => {
    expectJSONSchema(Schema.Number, {
      "type": "number"
    })
  })

  it("JsonNumber", () => {
    expectJSONSchemaProperty(Schema.JsonNumber, {
      "$defs": {
        "JsonNumber": {
          "type": "number",
          "description": "a JSON-compatible number, excluding NaN, +Infinity, and -Infinity",
          "title": "JSON-compatible number"
        }
      },
      "$ref": "#/$defs/JsonNumber"
    })
  })

  it("Boolean", () => {
    expectJsonSchemaAnnotations(Schema.Boolean, {
      "type": "boolean"
    })
  })

  it("TemplateLiteral", () => {
    const schema = Schema.TemplateLiteral(Schema.Literal("a"), Schema.Number)
    const jsonSchema: JSONSchema.JsonSchema7Root = {
      "type": "string",
      "pattern": "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$",
      "description": "a template literal"
    }
    expectJsonSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    expect(validate("a1")).toEqual(true)
    expect(validate("a12")).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate("aa")).toEqual(false)
  })

  describe("Literal", () => {
    it("Null", () => {
      expectJsonSchemaAnnotations(Schema.Null, {
        "enum": [null]
      })
    })

    it("string literals", () => {
      expectJsonSchemaAnnotations(Schema.Literal("a"), {
        "enum": ["a"]
      })
      expectJsonSchemaAnnotations(Schema.Literal("a", "b"), {
        "enum": ["a", "b"]
      })
    })

    it("number literals", () => {
      expectJsonSchemaAnnotations(Schema.Literal(1), {
        "enum": [1]
      })
      expectJsonSchemaAnnotations(Schema.Literal(1, 2), {
        "enum": [1, 2]
      })
    })

    it("boolean literals", () => {
      expectJsonSchemaAnnotations(Schema.Literal(true), {
        "enum": [true]
      })
      expectJsonSchemaAnnotations(Schema.Literal(false), {
        "enum": [false]
      })
      expectJsonSchemaAnnotations(Schema.Literal(true, false), {
        "enum": [true, false]
      })
    })

    it("union of literals", () => {
      expectJsonSchemaAnnotations(Schema.Literal(1, true), {
        "enum": [1, true]
      })
    })
  })

  describe("Enums", () => {
    it("numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJsonSchemaAnnotations(Schema.Enums(Fruits), {
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

  describe("Refinement", () => {
    it("minLength", () => {
      expectJsonSchemaAnnotations(Schema.String.pipe(Schema.minLength(1)), {
        "type": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
    })

    it("maxLength", () => {
      expectJsonSchemaAnnotations(Schema.String.pipe(Schema.maxLength(1)), {
        "type": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
    })

    it("length: number", () => {
      expectJsonSchemaAnnotations(Schema.String.pipe(Schema.length(1)), {
        "type": "string",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
    })

    it("length: { min, max }", () => {
      expectJsonSchemaAnnotations(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
        "type": "string",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
    })

    it("greaterThan", () => {
      expectJsonSchemaAnnotations(JsonNumber.pipe(Schema.greaterThan(1)), {
        "type": "number",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
    })

    it("greaterThanOrEqualTo", () => {
      expectJsonSchemaAnnotations(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1)), {
        "type": "number",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
    })

    it("lessThan", () => {
      expectJsonSchemaAnnotations(JsonNumber.pipe(Schema.lessThan(1)), {
        "type": "number",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
    })

    it("lessThanOrEqualTo", () => {
      expectJsonSchemaAnnotations(JsonNumber.pipe(Schema.lessThanOrEqualTo(1)), {
        "type": "number",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
    })

    it("pattern", () => {
      expectJsonSchemaAnnotations(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
        "type": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
    })

    it("int", () => {
      expectJsonSchemaAnnotations(JsonNumber.pipe(Schema.int()), {
        "type": "integer",
        "title": "integer",
        "description": "an integer"
      })
    })

    it("Trimmed", () => {
      const schema = Schema.Trimmed
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Trimmed": {
            "description": "a string with no leading or trailing whitespace",
            "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
            "title": "Trimmed",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Trimmed"
      })
    })
  })

  describe("Tuple", () => {
    it("empty tuple", () => {
      const schema = Schema.Tuple()
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "maxItems": 0
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(false)
    })

    it("element", () => {
      const schema = Schema.Tuple(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "items": [{
          "type": "number"
        }],
        "minItems": 1,
        "additionalItems": false
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
    })

    it("element + inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Tuple(JsonNumber.annotations({ description: "inner" })),
        {
          "type": "array",
          "items": [{
            "type": "number",
            "description": "inner"
          }],
          "minItems": 1,
          "additionalItems": false
        }
      )
    })

    it("element + outer annotations should override inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Tuple(
          Schema.element(JsonNumber.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "items": [{
            "type": "number",
            "description": "outer"
          }],
          "minItems": 1,
          "additionalItems": false
        }
      )
    })

    it("optionalElement", () => {
      const schema = Schema.Tuple(Schema.optionalElement(JsonNumber))
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "number"
          }
        ],
        "additionalItems": false
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
    })

    it("optionalElement + inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Tuple(Schema.optionalElement(JsonNumber).annotations({ description: "inner" })),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "number",
              "description": "inner"
            }
          ],
          "additionalItems": false
        }
      )
    })

    it("optionalElement + outer annotations should override inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Tuple(
          Schema.optionalElement(JsonNumber).annotations({ description: "inner" }).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "number",
              "description": "outer"
            }
          ],
          "additionalItems": false
        }
      )
    })

    it("element + optionalElement", () => {
      const schema = Schema.Tuple(
        Schema.element(Schema.String.annotations({ description: "inner" })).annotations({ description: "outer" }),
        Schema.optionalElement(JsonNumber.annotations({ description: "inner?" })).annotations({
          description: "outer?"
        })
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "minItems": 1,
        "items": [
          {
            "type": "string",
            "description": "outer"
          },
          {
            "type": "number",
            "description": "outer?"
          }
        ],
        "additionalItems": false
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
    })

    it("rest", () => {
      const schema = Schema.Array(JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "items": {
          "type": "number"
        }
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate([1, 2])).toEqual(true)
      expect(validate([1, 2, 3])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2, 3, "a"])).toEqual(false)
    })

    it("rest + inner annotations", () => {
      expectJsonSchemaAnnotations(Schema.Array(JsonNumber.annotations({ description: "inner" })), {
        "type": "array",
        "items": {
          "type": "number",
          "description": "inner"
        }
      })
    })

    it("optionalElement + rest + inner annotations", () => {
      const schema = Schema.Tuple(
        [Schema.optionalElement(Schema.String)],
        Schema.element(JsonNumber.annotations({ description: "inner" }))
      )
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "string"
          }
        ],
        "additionalItems": {
          "type": "number",
          "description": "inner"
        }
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      expect(validate(["a", "b", 1])).toEqual(false)
    })

    it("optionalElement + rest + outer annotations should override inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Tuple(
          [Schema.optionalElement(Schema.String)],
          Schema.element(JsonNumber.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "string"
            }
          ],
          "additionalItems": {
            "type": "number",
            "description": "outer"
          }
        }
      )
    })

    it("element + rest", () => {
      const schema = Schema.Tuple([Schema.String], JsonNumber)
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "array",
        "items": [{
          "type": "string"
        }],
        "minItems": 1,
        "additionalItems": {
          "type": "number"
        }
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate(["a", 1, 2])).toEqual(true)
      expect(validate(["a", 1, 2, 3])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate([1])).toEqual(false)
      expect(validate(["a", "b"])).toEqual(false)
    })

    it("NonEmptyArray", () => {
      expectJSONSchemaProperty(
        Schema.NonEmptyArray(Schema.String),
        {
          type: "array",
          minItems: 1,
          items: { type: "string" }
        }
      )
    })
  })

  describe("Struct", () => {
    it("Baseline", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: JsonNumber
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "type": "object",
        "properties": {
          "a": { "type": "string" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
    })

    it("field + inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.String.annotations({ description: "inner" })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "required": ["a"],
          "additionalProperties": false
        }
      )
    })

    it("field + outer annotation should override inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.propertySignature(Schema.String.annotations({ description: "inner" })).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "required": ["a"],
          "additionalProperties": false
        }
      )
    })

    it("Struct + Record", () => {
      const schema = Schema.Struct({
        a: Schema.String
      }, Schema.Record({ key: Schema.String, value: Schema.String }))
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({ a: "a", b: "b" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: "b" })).toEqual(false)
      expect(validate({ a: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1 })).toEqual(false)
    })

    it("exact optional field", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: Schema.optionalWith(JsonNumber, { exact: true })
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
    })

    it("exact optional field + inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String.annotations({ description: "inner" }), { exact: true })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "required": [],
          "additionalProperties": false
        }
      )
    })

    it("exact optional field + outer annotation should override inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String.annotations({ description: "inner" }), { exact: true }).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "required": [],
          "additionalProperties": false
        }
      )
    })
  })

  describe("Record", () => {
    it("Record(refinement, number)", () => {
      expectJsonSchemaAnnotations(
        Schema.Record({ key: Schema.String.pipe(Schema.minLength(1)), value: JsonNumber }),
        {
          "type": "object",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "type": "number"
            }
          },
          "propertyNames": {
            "type": "string",
            "description": "a string at least 1 character(s) long",
            "minLength": 1
          }
        }
      )
    })

    it("Record(string, number)", () => {
      expectJsonSchemaAnnotations(Schema.Record({ key: Schema.String, value: JsonNumber }), {
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
      expectJsonSchemaAnnotations(
        Schema.Record(
          { key: Schema.Union(Schema.Literal("a"), Schema.Literal("b")), value: JsonNumber }
        ),
        {
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
        "type": "object",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": { "type": "number" }
        },
        "propertyNames": {
          "pattern": "^.*-.*$",
          "type": "string"
        }
      }
      expectJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
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
      expectJsonSchemaAnnotations(schema, jsonSchema)
      expect(jsonSchema).toStrictEqual(jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({})).toEqual(true)
      expect(validate({ "-": 1 })).toEqual(true)
      expect(validate({ "a-": 1 })).toEqual(true)
      expect(validate({ "-b": 1 })).toEqual(true)
      expect(validate({ "a-b": 1 })).toEqual(true)
      expect(validate({ "": 1 })).toEqual(false)
      expect(validate({ "-": "a" })).toEqual(false)
    })
  })

  describe("Union", () => {
    it("string | JsonNumber", () => {
      expectJsonSchemaAnnotations(Schema.Union(Schema.String, JsonNumber), {
        "anyOf": [
          { "type": "string" },
          { "type": "number" }
        ]
      })
    })

    describe("Union including literals", () => {
      it(`1 | 2`, () => {
        expectJsonSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2)), {
          "enum": [1, 2]
        })
      })

      it(`1(with description) | 2`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1).annotations({ description: "43d87cd1-df64-457f-8119-0401ecd1399e" }),
            Schema.Literal(2)
          ),
          {
            "anyOf": [
              { "enum": [1], "description": "43d87cd1-df64-457f-8119-0401ecd1399e" },
              { "enum": [2] }
            ]
          }
        )
      })

      it(`1 | 2(with description)`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "28e1ba58-7c13-4667-88cb-2baa1ac31a0f" })
          ),
          {
            "anyOf": [
              { "enum": [1] },
              { "enum": [2], "description": "28e1ba58-7c13-4667-88cb-2baa1ac31a0f" }
            ]
          }
        )
      })

      it(`1 | 2 | string`, () => {
        expectJsonSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2), Schema.String), {
          "anyOf": [
            { "enum": [1, 2] },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2) | string`, () => {
        expectJsonSchemaAnnotations(Schema.Union(Schema.Literal(1, 2), Schema.String), {
          "anyOf": [
            { "enum": [1, 2] },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2)(with description) | string`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1, 2).annotations({ description: "d0121d0e-8b56-4a2e-9963-47a0965d6a3c" }),
            Schema.String
          ),
          {
            "anyOf": [
              { "enum": [1, 2], "description": "d0121d0e-8b56-4a2e-9963-47a0965d6a3c" },
              { "type": "string" }
            ]
          }
        )
      })

      it(`(1 | 2)(with description) | 3 | string`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1, 2).annotations({ description: "eca4431f-c97c-454f-8167-6c2e81430c6b" }),
            Schema.Literal(3),
            Schema.String
          ),
          {
            "anyOf": [
              { "enum": [1, 2], "description": "eca4431f-c97c-454f-8167-6c2e81430c6b" },
              { "enum": [3] },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1(with description) | 2 | string`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1).annotations({ description: "867c07f5-5710-477c-8296-239694e86562" }),
            Schema.Literal(2),
            Schema.String
          ),
          {
            "anyOf": [
              { "enum": [1], "description": "867c07f5-5710-477c-8296-239694e86562" },
              { "enum": [2] },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1 | 2(with description) | string`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "4e49a840-5fb8-43f6-916f-565cbf532db4" }),
            Schema.String
          ),
          {
            "anyOf": [
              { "enum": [1] },
              { "enum": [2], "description": "4e49a840-5fb8-43f6-916f-565cbf532db4" },
              { "type": "string" }
            ]
          }
        )
      })

      it(`string | 1 | 2 `, () => {
        expectJsonSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1), Schema.Literal(2)), {
          "anyOf": [
            { "type": "string" },
            { "enum": [1, 2] }
          ]
        })
      })

      it(`string | (1 | 2) `, () => {
        expectJsonSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1, 2)), {
          "anyOf": [
            { "type": "string" },
            { "enum": [1, 2] }
          ]
        })
      })

      it(`string | 1(with description) | 2`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.String,
            Schema.Literal(1).annotations({ description: "26521e57-cfb6-4563-abe2-2fe920398e16" }),
            Schema.Literal(2)
          ),
          {
            "anyOf": [
              { "type": "string" },
              { "enum": [1], "description": "26521e57-cfb6-4563-abe2-2fe920398e16" },
              { "enum": [2] }
            ]
          }
        )
      })

      it(`string | 1 | 2(with description)`, () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.String,
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "c4fb2a01-68ff-43d2-81d0-de799c06e9c0" })
          ),
          {
            "anyOf": [
              { "type": "string" },
              { "enum": [1] },
              { "enum": [2], "description": "c4fb2a01-68ff-43d2-81d0-de799c06e9c0" }
            ]
          }
        )
      })
    })
  })

  describe("Transformation", () => {
    it("NumberFromString", () => {
      expectJSONSchemaProperty(Schema.NumberFromString, {
        "$defs": {
          "NumberFromString": {
            "type": "string",
            "description": "a string that will be parsed into a number"
          }
        },
        "$ref": "#/$defs/NumberFromString"
      })
    })

    it("DateFromString", () => {
      expectJSONSchemaProperty(
        Schema.DateFromString,
        {
          "$defs": {
            "DateFromString": {
              "type": "string",
              "description": "a string that will be parsed into a Date"
            }
          },
          "$ref": "#/$defs/DateFromString"
        }
      )
    })

    it("Date", () => {
      expectJSONSchemaProperty(
        Schema.Date,
        {
          "$defs": {
            "Date": {
              "type": "string",
              "description": "a string that will be parsed into a Date"
            }
          },
          "$ref": "#/$defs/Date"
        }
      )
    })

    it("OptionFromNullOr", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.OptionFromNullOr(Schema.NonEmptyString)
        }),
        {
          "$defs": {
            "NonEmptyString": {
              "type": "string",
              "description": "a non empty string",
              "title": "NonEmptyString",
              "minLength": 1
            }
          },
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "anyOf": [
                {
                  "$ref": "#/$defs/NonEmptyString"
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

    it("ReadonlyMapFromRecord", () => {
      expectJSONSchemaProperty(
        Schema.ReadonlyMapFromRecord({
          key: Schema.String.pipe(Schema.minLength(2)),
          value: Schema.NumberFromString
        }),
        {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string that will be parsed into a number"
            }
          },
          "type": "object",
          "description": "a record that will be parsed into a ReadonlyMap",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "$ref": "#/$defs/NumberFromString"
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
      expectJSONSchemaProperty(
        Schema.MapFromRecord({
          key: Schema.String.pipe(Schema.minLength(2)),
          value: Schema.NumberFromString
        }),
        {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string that will be parsed into a number"
            }
          },
          "type": "object",
          "description": "a record that will be parsed into a Map",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "$ref": "#/$defs/NumberFromString"
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

    describe("TypeLiteralTransformations", () => {
      describe("manual TypeLiteralTransformation", () => {
        it("an identifier annotation on the transformation should overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([], [], { [AST.IdentifierAnnotationId]: "IDFrom" }),
              new AST.TypeLiteral([], []),
              new AST.TypeLiteralTransformation([]),
              { [AST.IdentifierAnnotationId]: "ID" }
            )
          )
          expectJSONSchemaProperty(schema, {
            "$ref": "#/$defs/ID",
            "$defs": {
              "ID": {
                "$id": "/schemas/{}",
                "anyOf": [
                  {
                    "type": "object"
                  },
                  {
                    "type": "array"
                  }
                ]
              }
            }
          })
        })

        it("a title annotation on the transformation should not overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([], [], { [AST.TitleAnnotationId]: "from title" }),
              new AST.TypeLiteral([], []),
              new AST.TypeLiteralTransformation([]),
              { [AST.TitleAnnotationId]: "transformation title" }
            )
          )
          expectJSONSchemaProperty(schema, {
            "$id": "/schemas/{}",
            "anyOf": [
              {
                "type": "object"
              },
              {
                "type": "array"
              }
            ],
            "title": "from title"
          })
        })

        it("a description annotation on the transformation should not overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([], [], { [AST.DescriptionAnnotationId]: "from description" }),
              new AST.TypeLiteral([], []),
              new AST.TypeLiteralTransformation([]),
              { [AST.DescriptionAnnotationId]: "transformation description" }
            )
          )
          expectJSONSchemaProperty(schema, {
            "$id": "/schemas/{}",
            "anyOf": [
              {
                "type": "object"
              },
              {
                "type": "array"
              }
            ],
            "description": "from description"
          })
        })
      })

      describe("optionalWith", () => {
        describe(`{ default: () => ... } option`, () => {
          it("base", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }),
              {
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmptyString",
                    "minLength": 1
                  }
                },
                "type": "object",
                "required": [],
                "properties": {
                  "a": {
                    "$ref": "#/$defs/NonEmptyString"
                  }
                },
                "additionalProperties": false
              }
            )
          })

          it("with property signature annotations", () => {
            const schema = Schema.Struct({
              a: Schema.optionalWith(Schema.NonEmptyString.annotations({ description: "inner" }), {
                default: () => ""
              }).annotations({ description: "outer" })
            })
            expectJSONSchemaProperty(schema, {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "description": "inner",
                  "title": "NonEmptyString",
                  "minLength": 1
                }
              },
              "type": "object",
              "required": [],
              "properties": {
                "a": {
                  "$ref": "#/$defs/NonEmptyString"
                }
              },
              "additionalProperties": false
            })
            expectJSONSchemaProperty(Schema.typeSchema(schema), {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "description": "inner",
                  "title": "NonEmptyString",
                  "minLength": 1
                }
              },
              "type": "object",
              "required": [
                "a"
              ],
              "properties": {
                "a": {
                  "$ref": "#/$defs/NonEmptyString",
                  "description": "outer"
                }
              },
              "additionalProperties": false
            })
            expectJSONSchemaProperty(Schema.encodedSchema(schema), {
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

          it("with transformation annotations", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }).annotations({
                description: "37206c09-5874-4023-a909-fdad0a5880fa",
                title: "0dd0767e-2926-4a5d-b436-f1be9bf6eb22"
              }),
              {
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmptyString",
                    "minLength": 1
                  }
                },
                "type": "object",
                "description": "37206c09-5874-4023-a909-fdad0a5880fa",
                "title": "0dd0767e-2926-4a5d-b436-f1be9bf6eb22",
                "required": [],
                "properties": {
                  "a": {
                    "$ref": "#/$defs/NonEmptyString"
                  }
                },
                "additionalProperties": false
              }
            )
          })

          it("with transformation identifier annotation", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }).annotations({
                identifier: "9c770281-0f1e-4dd3-8aa1-58a4d91f4520",
                description: "3a759a22-86c6-41a4-a596-6c4ad09940bf",
                title: "0113292b-31a4-4ede-8524-564272f2be52"
              }),
              {
                "$ref": "#/$defs/9c770281-0f1e-4dd3-8aa1-58a4d91f4520",
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmptyString",
                    "minLength": 1
                  },
                  "9c770281-0f1e-4dd3-8aa1-58a4d91f4520": {
                    "type": "object",
                    "description": "3a759a22-86c6-41a4-a596-6c4ad09940bf",
                    "title": "0113292b-31a4-4ede-8524-564272f2be52",
                    "required": [],
                    "properties": {
                      "a": {
                        "$ref": "#/$defs/NonEmptyString"
                      }
                    },
                    "additionalProperties": false
                  }
                }
              }
            )
          })
        })

        describe(`{ as: "Option" } option`, () => {
          it("base", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }),
              {
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmptyString",
                    "minLength": 1
                  }
                },
                "type": "object",
                "required": [],
                "properties": {
                  "a": {
                    "$ref": "#/$defs/NonEmptyString"
                  }
                },
                "additionalProperties": false
              }
            )
          })

          it("with transformation identifier annotation", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }).annotations({
                identifier: "aa6f48cd-03e4-470a-beb7-5f7cc532c676",
                description: "b964b873-0266-446b-acf4-97dc125e7553",
                title: "aa67b73c-3161-4640-b1e1-5b5830cfb173"
              }),
              {
                "$ref": "#/$defs/aa6f48cd-03e4-470a-beb7-5f7cc532c676",
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "a non empty string",
                    "title": "NonEmptyString",
                    "minLength": 1
                  },
                  "aa6f48cd-03e4-470a-beb7-5f7cc532c676": {
                    "type": "object",
                    "required": [],
                    "properties": {
                      "a": {
                        "$ref": "#/$defs/NonEmptyString"
                      }
                    },
                    "additionalProperties": false,
                    "description": "b964b873-0266-446b-acf4-97dc125e7553",
                    "title": "aa67b73c-3161-4640-b1e1-5b5830cfb173"
                  }
                }
              }
            )
          })
        })
      })

      describe("fromKey", () => {
        it("base", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }),
            {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "description": "a non empty string",
                  "title": "NonEmptyString",
                  "minLength": 1
                }
              },
              "type": "object",
              "required": [
                "b"
              ],
              "properties": {
                "b": {
                  "$ref": "#/$defs/NonEmptyString"
                }
              },
              "additionalProperties": false
            }
          )
        })

        it("with transformation identifier annotation", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }).annotations({
              identifier: "d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea",
              description: "5f7bc5b8-dd68-4ec5-b9e9-64df74bd3c45",
              title: "119da226-70aa-4ae6-ab63-7db10c7e9dde"
            }),
            {
              "$ref": "#/$defs/d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea",
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "description": "a non empty string",
                  "title": "NonEmptyString",
                  "minLength": 1
                },
                "d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea": {
                  "type": "object",
                  "required": [
                    "b"
                  ],
                  "properties": {
                    "b": {
                      "$ref": "#/$defs/NonEmptyString"
                    }
                  },
                  "additionalProperties": false,
                  "description": "5f7bc5b8-dd68-4ec5-b9e9-64df74bd3c45",
                  "title": "119da226-70aa-4ae6-ab63-7db10c7e9dde"
                }
              }
            }
          )
        })
      })
    })
  })

  describe("parseJson", () => {
    it(`should correctly generate JSON Schemas by targeting the "to" side of transformations`, () => {
      expectJSONSchema(
        Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString)
        })),
        {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string that will be parsed into a number"
            }
          },
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": {
              "$ref": "#/$defs/NumberFromString"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("TypeLiteralTransformations", () => {
      expectJSONSchema(
        Schema.parseJson(Schema.Struct({
          a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
        })),
        {
          "$defs": {
            "NonEmptyString": {
              "type": "string",
              "description": "a non empty string",
              "title": "NonEmptyString",
              "minLength": 1
            }
          },
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "$ref": "#/$defs/NonEmptyString"
            }
          },
          "additionalProperties": false
        }
      )
    })
  })

  describe("Suspend", () => {
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
      ).annotations({ identifier: "cdb51157-6f4a-42c1-9075-5b9af3a1448c" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$ref": "#/$defs/cdb51157-6f4a-42c1-9075-5b9af3a1448c",
        "$defs": {
          "cdb51157-6f4a-42c1-9075-5b9af3a1448c": {
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
                  "$ref": "#/$defs/cdb51157-6f4a-42c1-9075-5b9af3a1448c"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
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
        as: Schema.Array(
          Schema.suspend((): Schema.Schema<A> => schema).annotations({
            identifier: "c4588a13-c003-4b8d-930f-d3469925ec1b"
          })
        )
      })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
              "$ref": "#/$defs/c4588a13-c003-4b8d-930f-d3469925ec1b"
            }
          }
        },
        "additionalProperties": false,
        "$defs": {
          "c4588a13-c003-4b8d-930f-d3469925ec1b": {
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
                  "$ref": "#/$defs/c4588a13-c003-4b8d-930f-d3469925ec1b"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
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
      }).annotations({ identifier: "5c2a4755-f8f2-4290-a40f-ed247803a1a0" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$ref": "#/$defs/5c2a4755-f8f2-4290-a40f-ed247803a1a0",
        "$defs": {
          "5c2a4755-f8f2-4290-a40f-ed247803a1a0": {
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
                  "$ref": "#/$defs/5c2a4755-f8f2-4290-a40f-ed247803a1a0"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
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
      ).annotations({ identifier: "2ad5683a-878f-4e4d-909c-496e59ce62e0" })

      // intended outer suspend
      const Operation: Schema.Schema<Operation> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("operation"),
          operator: Schema.Union(Schema.Literal("+"), Schema.Literal("-")),
          left: Expression,
          right: Expression
        })
      ).annotations({ identifier: "e0f2ce47-eac7-4991-8730-90ebe4e0ffda" })

      const jsonSchema: JSONSchema.JsonSchema7Root = {
        "$ref": "#/$defs/e0f2ce47-eac7-4991-8730-90ebe4e0ffda",
        "$defs": {
          "e0f2ce47-eac7-4991-8730-90ebe4e0ffda": {
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
                "$ref": "#/$defs/2ad5683a-878f-4e4d-909c-496e59ce62e0"
              },
              "right": {
                "$ref": "#/$defs/2ad5683a-878f-4e4d-909c-496e59ce62e0"
              }
            },
            "additionalProperties": false
          },
          "2ad5683a-878f-4e4d-909c-496e59ce62e0": {
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
                    "$ref": "#/$defs/e0f2ce47-eac7-4991-8730-90ebe4e0ffda"
                  }
                ]
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(Operation, jsonSchema, { numRuns: 5 })
      const validate = getAjvValidate(jsonSchema)
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

  it("examples JSON Schema annotation support", () => {
    expectJsonSchemaAnnotations(Schema.String.annotations({ examples: ["a", "b"] }), {
      "type": "string",
      "examples": ["a", "b"]
    })
  })

  it("default JSON Schema annotation support", () => {
    expectJsonSchemaAnnotations(Schema.String.annotations({ default: "" }), {
      "type": "string",
      "default": ""
    })
  })

  describe("Class", () => {
    it("should generate the same JSON Schema as Schema.encodedSchema(Class)", () => {
      class A extends Schema.Class<A>("7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95")({ a: Schema.String }) {}
      expectJSONSchemaProperty(A, {
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
      expect(JSONSchema.make(A)).toEqual(JSONSchema.make(Schema.encodedSchema(A)))
    })
  })

  it("compose", () => {
    expectJsonSchemaAnnotations(
      Schema.Struct({
        a: Schema.NonEmptyString.pipe(Schema.compose(Schema.NumberFromString))
      }),
      {
        "$defs": {
          "NonEmptyString": {
            "type": "string",
            "description": "a non empty string",
            "title": "NonEmptyString",
            "minLength": 1
          }
        },
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "$ref": "#/$defs/NonEmptyString"
          }
        },
        "additionalProperties": false
      }
    )
  })

  describe("extend", () => {
    it("should correctly generate JSON Schemas for a schema created by extending two refinements", () => {
      // TODO: why expectJsonSchemaAnnotations raises an error?
      expectJSONSchemaProperty(
        Schema.Struct({
          a: Schema.String
        }).pipe(Schema.filter(() => true, { jsonSchema: { description: "c5052c04-d6c9-44f3-9c8f-ede707d6ce38" } }))
          .pipe(Schema.extend(
            Schema.Struct({
              b: JsonNumber
            }).pipe(Schema.filter(() => true, { jsonSchema: { title: "940b4ea4-6313-4b59-9e64-ff7a41b8eb15" } }))
          )),
        {
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "number" }
          },
          "description": "c5052c04-d6c9-44f3-9c8f-ede707d6ce38",
          "title": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15",
          "additionalProperties": false
        }
      )
    })
  })

  describe("identifier annotation support", () => {
    it("String", () => {
      expectJSONSchemaProperty(Schema.String.annotations({ identifier: "6f274f5e-be19-48e6-8f33-16e9789b2731" }), {
        "$defs": {
          "6f274f5e-be19-48e6-8f33-16e9789b2731": {
            "type": "string"
          }
        },
        "$ref": "#/$defs/6f274f5e-be19-48e6-8f33-16e9789b2731"
      })
    })

    it("Refinement", () => {
      expectJSONSchemaProperty(
        Schema.String.pipe(Schema.minLength(2)).annotations({ identifier: "cd6647a4-dc64-40a7-a031-61d35ed904ca" }),
        {
          "$defs": {
            "cd6647a4-dc64-40a7-a031-61d35ed904ca": {
              "type": "string",
              "description": "a string at least 2 character(s) long",
              "minLength": 2
            }
          },
          "$ref": "#/$defs/cd6647a4-dc64-40a7-a031-61d35ed904ca"
        }
      )
    })

    describe("Struct", () => {
      it("self annotation", () => {
        expectJSONSchemaProperty(
          Schema.Struct({
            a: Schema.String
          }).annotations({ identifier: "0df962f3-f649-4ffc-a3ec-a8b5344dd7de" }),
          {
            "$defs": {
              "0df962f3-f649-4ffc-a3ec-a8b5344dd7de": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "$ref": "#/$defs/0df962f3-f649-4ffc-a3ec-a8b5344dd7de"
          }
        )
      })

      it("field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "44873d66-d138-4e2a-9782-5982a29f6ea8",
          description: "e5d30f53-b2df-4fa3-b151-9fc3a47d258e",
          title: "0115ccbf-5d27-41ed-a658-83c5f4a8805f"
        })
        const schema = Schema.Struct({
          a: Name
        })
        expectJSONSchemaProperty(schema, {
          "$defs": {
            "44873d66-d138-4e2a-9782-5982a29f6ea8": {
              "type": "string",
              "description": "e5d30f53-b2df-4fa3-b151-9fc3a47d258e",
              "title": "0115ccbf-5d27-41ed-a658-83c5f4a8805f"
            }
          },
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": {
              "$ref": "#/$defs/44873d66-d138-4e2a-9782-5982a29f6ea8"
            }
          },
          "additionalProperties": false
        })
      })

      it("self annotation + field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "b49f125d-1646-4eb5-8120-9524ab6039de",
          description: "703b7ff0-cb8d-49de-aeeb-05d92faa4599",
          title: "4b6d9ea6-7c4d-4073-a427-8d1b82fd1677"
        })
        expectJSONSchemaProperty(
          Schema.Struct({
            a: Name
          }).annotations({ identifier: "7e559891-9143-4138-ae3e-81a5f0907380" }),
          {
            "$defs": {
              "7e559891-9143-4138-ae3e-81a5f0907380": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "$ref": "#/$defs/b49f125d-1646-4eb5-8120-9524ab6039de" }
                },
                "additionalProperties": false
              },
              "b49f125d-1646-4eb5-8120-9524ab6039de": {
                "type": "string",
                "description": "703b7ff0-cb8d-49de-aeeb-05d92faa4599",
                "title": "4b6d9ea6-7c4d-4073-a427-8d1b82fd1677"
              }
            },
            "$ref": "#/$defs/7e559891-9143-4138-ae3e-81a5f0907380"
          }
        )
      })

      it("deeply nested field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "434a08dd-3f8f-4de4-b91d-8846aab1fb05",
          description: "eb183f5c-404c-4686-b78b-1bd00d18f8fd",
          title: "c0cbd438-1fb5-47fe-bf81-1ff5527e779a"
        })
        const schema = Schema.Struct({ a: Name, b: Schema.Struct({ c: Name }) })
        expectJSONSchemaProperty(schema, {
          "$defs": {
            "434a08dd-3f8f-4de4-b91d-8846aab1fb05": {
              "type": "string",
              "description": "eb183f5c-404c-4686-b78b-1bd00d18f8fd",
              "title": "c0cbd438-1fb5-47fe-bf81-1ff5527e779a"
            }
          },
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": {
              "$ref": "#/$defs/434a08dd-3f8f-4de4-b91d-8846aab1fb05"
            },
            "b": {
              "type": "object",
              "required": ["c"],
              "properties": {
                "c": { "$ref": "#/$defs/434a08dd-3f8f-4de4-b91d-8846aab1fb05" }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        })
      })
    })

    describe("Union", () => {
      it("Union of literals with identifiers", () => {
        expectJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal("a").annotations({
              description: "ef296f1c-01fe-4a20-bd35-ed449c964c49",
              identifier: "170d659f-112e-4e3b-85db-464b668f2aed"
            }),
            Schema.Literal("b").annotations({
              description: "effbf54b-a62d-455b-86fa-97a5af46c6f3",
              identifier: "2a4e4f67-3732-4f7b-a505-856e51dd1578"
            })
          ),
          {
            "$defs": {
              "170d659f-112e-4e3b-85db-464b668f2aed": {
                "enum": ["a"],
                "description": "ef296f1c-01fe-4a20-bd35-ed449c964c49"
              },
              "2a4e4f67-3732-4f7b-a505-856e51dd1578": {
                "enum": ["b"],
                "description": "effbf54b-a62d-455b-86fa-97a5af46c6f3"
              }
            },
            "anyOf": [
              { "$ref": "#/$defs/170d659f-112e-4e3b-85db-464b668f2aed" },
              { "$ref": "#/$defs/2a4e4f67-3732-4f7b-a505-856e51dd1578" }
            ]
          }
        )
      })
    })

    it("should borrow the identifier annotation when generating a schema through `encodedSchema()`", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }

      const schema: Schema.Schema<Category> = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(
          Schema.suspend(() => schema).annotations({ identifier: "0956eb10-753b-4ac5-a90b-ebb39d95541d" })
        )
      })

      expectJSONSchema(Schema.encodedSchema(schema), {
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
              "$ref": "#/$defs/0956eb10-753b-4ac5-a90b-ebb39d95541d"
            }
          }
        },
        "additionalProperties": false,
        "$defs": {
          "0956eb10-753b-4ac5-a90b-ebb39d95541d": {
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
                  "$ref": "#/$defs/0956eb10-753b-4ac5-a90b-ebb39d95541d"
                }
              }
            },
            "additionalProperties": false
          }
        }
      })
    })
  })

  describe("surrogate annotation support", () => {
    describe("Class", () => {
      it("should support typeSchema(Class)", () => {
        class A extends Schema.Class<A>("70ac1a3e-d046-4be0-8b32-8be7eced43a3")({ a: Schema.String }) {}
        expectJSONSchemaProperty(Schema.typeSchema(A), {
          "$defs": {
            "70ac1a3e-d046-4be0-8b32-8be7eced43a3": {
              "type": "object",
              "required": ["a"],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false,
              "description": "an instance of 70ac1a3e-d046-4be0-8b32-8be7eced43a3",
              "title": "70ac1a3e-d046-4be0-8b32-8be7eced43a3"
            }
          },
          "$ref": "#/$defs/70ac1a3e-d046-4be0-8b32-8be7eced43a3"
        })
        expectJSONSchemaProperty(
          Schema.typeSchema(A).annotations({
            description: "3dc02abf-b76d-4e66-bbc6-81e5d435aea3",
            title: "8c8e9575-579c-4ac6-aca5-9bb168d84e21"
          }),
          {
            "$defs": {
              "70ac1a3e-d046-4be0-8b32-8be7eced43a3": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": {
                    "type": "string"
                  }
                },
                "additionalProperties": false,
                "description": "3dc02abf-b76d-4e66-bbc6-81e5d435aea3",
                "title": "8c8e9575-579c-4ac6-aca5-9bb168d84e21"
              }
            },
            "$ref": "#/$defs/70ac1a3e-d046-4be0-8b32-8be7eced43a3"
          }
        )
      })

      it("with identifier annotation", () => {
        class A extends Schema.Class<A>("3aa58407-8688-48f4-95ee-dccf6eeccd79")({ a: Schema.String }, {
          identifier: "798908a2-365f-4d9b-8ec7-96fe840667fa",
          description: "e972ddfe-0031-4ceb-9201-d21c97e066e3",
          title: "ce02e6c4-fd67-41d1-ac75-75bec81fd987"
        }) {}
        expectJSONSchemaProperty(Schema.typeSchema(A), {
          "$defs": {
            "798908a2-365f-4d9b-8ec7-96fe840667fa": {
              "type": "object",
              "required": ["a"],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false,
              "description": "e972ddfe-0031-4ceb-9201-d21c97e066e3",
              "title": "ce02e6c4-fd67-41d1-ac75-75bec81fd987"
            }
          },
          "$ref": "#/$defs/798908a2-365f-4d9b-8ec7-96fe840667fa"
        })
        expectJSONSchemaProperty(
          Schema.typeSchema(A).annotations({
            description: "c0211013-fb29-46d8-9c8e-54625d1108eb",
            title: "b1ff8ecb-4191-4229-bb6f-2338ccbe85ee"
          }),
          {
            "$defs": {
              "798908a2-365f-4d9b-8ec7-96fe840667fa": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": {
                    "type": "string"
                  }
                },
                "additionalProperties": false,
                "description": "c0211013-fb29-46d8-9c8e-54625d1108eb",
                "title": "b1ff8ecb-4191-4229-bb6f-2338ccbe85ee"
              }
            },
            "$ref": "#/$defs/798908a2-365f-4d9b-8ec7-96fe840667fa"
          }
        )
      })
    })
  })

  describe("jsonSchema annotation support", () => {
    it("should have higher priority than surrogate annotation", () => {
      expectJSONSchema(
        Schema.String.annotations({
          [AST.SurrogateAnnotationId]: Schema.Number.ast,
          jsonSchema: { "type": "custom" }
        }),
        {
          "type": "custom"
        }
      )
    })

    describe("Class", () => {
      it("should support typeSchema(Class) with custom annotation", () => {
        class A extends Schema.Class<A>("3c9977ee-0e9b-4471-99af-c6c73340f9ed")({ a: Schema.String }, {
          jsonSchema: { "type": "custom" }
        }) {}
        expectJSONSchema(Schema.typeSchema(A), {
          "$defs": {
            "3c9977ee-0e9b-4471-99af-c6c73340f9ed": {
              "type": "custom"
            }
          },
          "$ref": "#/$defs/3c9977ee-0e9b-4471-99af-c6c73340f9ed"
        })
      })
    })

    it("Void", () => {
      expectJSONSchema(Schema.Void.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Never", () => {
      expectJSONSchema(Schema.Never.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Literal", () => {
      expectJSONSchema(Schema.Literal("a").annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("SymbolFromSelf", () => {
      expectJSONSchema(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("UniqueSymbolFromSelf", () => {
      expectJSONSchema(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("TemplateLiteral", () => {
      expectJSONSchema(
        Schema.TemplateLiteral(Schema.Literal("a"), Schema.String, Schema.Literal("b")).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("Undefined", () => {
      expectJSONSchema(Schema.Undefined.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Unknown", () => {
      expectJSONSchema(Schema.Unknown.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Any", () => {
      expectJSONSchema(Schema.Any.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Object", () => {
      expectJSONSchema(Schema.Object.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("String", () => {
      expectJSONSchema(
        Schema.String.annotations({
          jsonSchema: { "type": "custom", "description": "description" }
        }),
        {
          "type": "custom",
          "description": "description"
        }
      )
      expectJSONSchema(
        Schema.String.annotations({
          identifier: "MyID",
          jsonSchema: { "type": "custom", "description": "description" }
        }),
        {
          "$defs": {
            "MyID": {
              "type": "custom",
              "description": "description"
            }
          },
          "$ref": "#/$defs/MyID"
        }
      )
    })

    it("Number", () => {
      expectJSONSchema(Schema.Number.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("BigintFromSelf", () => {
      expectJSONSchema(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Boolean", () => {
      expectJSONSchema(Schema.Boolean.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchema(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Tuple", () => {
      expectJSONSchema(
        Schema.Tuple(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom" } }),
        { "type": "custom" }
      )
    })

    it("Struct", () => {
      expectJSONSchema(
        Schema.Struct({ a: Schema.String, b: JsonNumber }).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("Union", () => {
      expectJSONSchema(
        Schema.Union(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom" } }),
        { "type": "custom" }
      )
    })

    it("Suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(
          Schema.suspend((): Schema.Schema<A> => schema).annotations({ jsonSchema: { "type": "custom" } })
        )
      })

      expectJSONSchema(schema, {
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
              "type": "custom"
            }
          }
        },
        "additionalProperties": false
      })
    })

    describe("Refinement", () => {
      it("Int", () => {
        expectJSONSchema(Schema.Int.annotations({ jsonSchema: { "type": "custom" } }), {
          "$defs": {
            "Int": {
              "description": "an integer",
              "title": "Int",
              "type": "custom"
            }
          },
          "$ref": "#/$defs/Int"
        })
      })

      it("custom", () => {
        expectJSONSchemaProperty(
          Schema.String.pipe(Schema.filter(() => true, { jsonSchema: {} })).annotations({ identifier: "MyID" }),
          {
            "$ref": "#/$defs/MyID",
            "$defs": {
              "MyID": {
                "type": "string"
              }
            }
          }
        )
      })
    })

    it("Transformation", () => {
      expectJSONSchema(Schema.NumberFromString.annotations({ jsonSchema: { "type": "custom" } }), {
        "$defs": {
          "NumberFromString": {
            "type": "custom"
          }
        },
        "$ref": "#/$defs/NumberFromString"
      })
    })

    it("refinement of a transformation with an override annotation", () => {
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { type: "string", format: "date-time" } }), {
        "$defs": {
          "Date": {
            "format": "date-time",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Date"
      })
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        {
          "$defs": {
            "Date": {
              "anyOf": [{ "type": "object" }, { "type": "array" }]
            }
          },
          "$ref": "#/$defs/Date"
        }
      )
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        {
          "$defs": {
            "Date": {
              "anyOf": [{ "type": "object" }, { "type": "array" }]
            }
          },
          "$ref": "#/$defs/Date"
        }
      )
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "$ref": "x" } }), {
        "$defs": {
          "Date": {
            "$ref": "x"
          }
        },
        "$ref": "#/$defs/Date"
      })
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "const": 1 } }), {
        "$defs": {
          "Date": {
            "const": 1
          }
        },
        "$ref": "#/$defs/Date"
      })
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "enum": [1] } }), {
        "$defs": {
          "Date": {
            "enum": [1]
          }
        },
        "$ref": "#/$defs/Date"
      })
    })

    it("refinement of a transformation without an override annotation", () => {
      expectJSONSchema(Schema.Trim.pipe(Schema.nonEmptyString()), {
        "type": "string",
        "description": "a string that will be trimmed"
      })
      expectJSONSchema(
        Schema.Trim.pipe(Schema.nonEmptyString({ jsonSchema: { title: "a0ba6c10-091e-4ceb-9773-25fb1466fb1b" } })),
        {
          "type": "string",
          "description": "a string that will be trimmed"
        }
      )
      expectJSONSchema(
        Schema.Trim.pipe(Schema.nonEmptyString()).annotations({
          jsonSchema: { title: "75f7eb4f-626d-4dc6-af48-c17094418d85" }
        }),
        {
          "type": "string",
          "description": "a string that will be trimmed"
        }
      )
    })
  })

  describe("Pruning `undefined` and make the property optional by default", () => {
    it("Schema.optional", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String)
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false
        }
      )
    })

    it("Schema.optional + inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String.annotations({ description: "inner" }))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("Schema.optional + outer annotation should override inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String.annotations({ description: "inner" })).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String)
        }),
        {
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

    it("UndefinedOr + inner annotation", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String.annotations({ description: "inner" }))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + annotation should override inner annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String.annotations({ description: "inner" })).annotations({
            description: "middle"
          })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "middle"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + propertySignature annotation should override inner and middle annotations", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.propertySignature(
            Schema.UndefinedOr(Schema.String.annotations({ description: "inner" })).annotations({
              description: "middle"
            })
          ).annotations({ description: "outer" })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + jsonSchema annotation should keep the property required", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String).annotations({ jsonSchema: { "type": "string" } })
        }),
        {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false
        }
      )
    })

    it("OptionFromUndefinedOr", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.OptionFromUndefinedOr(Schema.String)
        }),
        {
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

    it("parseJson + OptionFromUndefinedOr", () => {
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.parseJson(Schema.OptionFromUndefinedOr(Schema.String))
        }),
        {
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
