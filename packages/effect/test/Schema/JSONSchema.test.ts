import AjvNonEsm from "ajv"
import * as A from "effect/Arbitrary"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const Ajv = AjvNonEsm.default

const ajvOptions = {
  strictTuples: false,
  allowMatchingProperties: true
}

const getAjvValidate = (jsonSchema: JSONSchema.JsonSchema7Root): AjvNonEsm.ValidateFunction =>
  new Ajv(ajvOptions).compile(jsonSchema)

const doProperty = false

const propertyType = <A, I>(schema: Schema.Schema<A, I>, options?: {
  params?: fc.Parameters<[I]>
}) => {
  if (!doProperty) {
    return
  }
  const encodedBoundSchema = Schema.encodedBoundSchema(schema)
  const arb = A.make(encodedBoundSchema)
  const is = Schema.is(encodedBoundSchema)
  const jsonSchema = JSONSchema.make(schema)
  const validate = getAjvValidate(jsonSchema)
  fc.assert(fc.property(arb, (i) => is(i) && validate(i)), options?.params)
}

const expectJSONSchemaOnly = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object
) => {
  const jsonSchema = JSONSchema.make(schema)
  expect(jsonSchema).toEqual({
    "$schema": "http://json-schema.org/draft-07/schema#",
    ...expected
  })
}

const expectJSONSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  propertyTypeOptions?: {
    params?: fc.Parameters<[I]>
  }
) => {
  expectJSONSchemaOnly(schema, expected)
  propertyType(schema, propertyTypeOptions)
}

const expectJSONSchemaJsonSchemaAnnotations = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  propertyTypeOptions?: {
    params?: fc.Parameters<[I]>
  }
) => {
  expectJSONSchemaOnly(schema, expected)
  propertyType(schema, propertyTypeOptions)
  const jsonSchemaAnnotations = {
    description: "mydescription",
    title: "mytitle"
  }
  const schemaWithAnnotations = schema.annotations(jsonSchemaAnnotations)
  expectJSONSchemaOnly(schemaWithAnnotations, { ...expected, ...jsonSchemaAnnotations })
  propertyType(schemaWithAnnotations, propertyTypeOptions)
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
    expectJSONSchemaJsonSchemaAnnotations(Schema.Any, {
      "$id": "/schemas/any",
      "title": "any"
    })
  })

  it("Unknown", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.Unknown, {
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
    expectJSONSchemaJsonSchemaAnnotations(Schema.Object, jsonSchema)

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
    expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    expect(validate({})).toEqual(true)
    expect(validate({ a: 1 })).toEqual(true)
    expect(validate([])).toEqual(true)
    expect(validate(null)).toEqual(false)
    expect(validate(1)).toEqual(false)
    expect(validate(true)).toEqual(false)
  })

  it("Void", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.Void, {
      "$id": "/schemas/void",
      "title": "void"
    })
  })

  it("String", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.String, {
      "type": "string"
    })
  })

  it("Number", () => {
    expectJSONSchemaOnly(Schema.Number, {
      "type": "number"
    })
  })

  it("JsonNumber", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.JsonNumber, {
      "type": "number",
      "description": "a JSON-compatible number, excluding NaN, +Infinity, and -Infinity",
      "title": "JSON-compatible number"
    })
  })

  it("Boolean", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.Boolean, {
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
    expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    expect(validate("a1")).toEqual(true)
    expect(validate("a12")).toEqual(true)
    expect(validate("a")).toEqual(false)
    expect(validate("aa")).toEqual(false)
  })

  describe("Literal", () => {
    it("Null", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Null, {
        "enum": [null]
      })
    })

    it("string literals", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal("a"), {
        "enum": ["a"]
      })
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal("a", "b"), {
        "enum": ["a", "b"]
      })
    })

    it("number literals", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(1), {
        "enum": [1]
      })
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(1, 2), {
        "enum": [1, 2]
      })
    })

    it("boolean literals", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(true), {
        "enum": [true]
      })
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(false), {
        "enum": [false]
      })
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(true, false), {
        "enum": [true, false]
      })
    })

    it("union of literals", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Literal(1, true), {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Enums(Fruits), {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.String.pipe(Schema.minLength(1)), {
        "type": "string",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
    })

    it("maxLength", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.String.pipe(Schema.maxLength(1)), {
        "type": "string",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
    })

    it("length: number", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.String.pipe(Schema.length(1)), {
        "type": "string",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
    })

    it("length: { min, max }", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
        "type": "string",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
    })

    it("greaterThan", () => {
      expectJSONSchemaJsonSchemaAnnotations(JsonNumber.pipe(Schema.greaterThan(1)), {
        "type": "number",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
    })

    it("greaterThanOrEqualTo", () => {
      expectJSONSchemaJsonSchemaAnnotations(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1)), {
        "type": "number",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
    })

    it("lessThan", () => {
      expectJSONSchemaJsonSchemaAnnotations(JsonNumber.pipe(Schema.lessThan(1)), {
        "type": "number",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
    })

    it("lessThanOrEqualTo", () => {
      expectJSONSchemaJsonSchemaAnnotations(JsonNumber.pipe(Schema.lessThanOrEqualTo(1)), {
        "type": "number",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
    })

    it("pattern", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
        "type": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
    })

    it("int", () => {
      expectJSONSchemaJsonSchemaAnnotations(JsonNumber.pipe(Schema.int()), {
        "type": "integer",
        "title": "integer",
        "description": "an integer"
      })
    })

    it("Trimmed", () => {
      const schema = Schema.Trimmed
      expectJSONSchemaJsonSchemaAnnotations(schema, {
        "description": "a string with no leading or trailing whitespace",
        "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
        "title": "Trimmed",
        "type": "string"
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([1])).toEqual(true)
      expect(validate([])).toEqual(false)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, "a"])).toEqual(false)
    })

    it("element + inner annotations", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
    })

    it("optionalElement + inner annotations", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate([1])).toEqual(true)
      expect(validate([1, 2])).toEqual(true)
      expect(validate([1, 2, 3])).toEqual(true)
      expect(validate(["a"])).toEqual(false)
      expect(validate([1, 2, 3, "a"])).toEqual(false)
    })

    it("rest + inner annotations", () => {
      expectJSONSchemaJsonSchemaAnnotations(Schema.Array(JsonNumber.annotations({ description: "inner" })), {
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile(jsonSchema)
      expect(validate([])).toEqual(true)
      expect(validate(["a"])).toEqual(true)
      expect(validate(["a", 1])).toEqual(true)
      expect(validate([1])).toEqual(false)
      expect(validate([1, 2])).toEqual(false)
      expect(validate(["a", "b", 1])).toEqual(false)
    })

    it("optionalElement + rest + outer annotations should override inner annotations", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = new Ajv({ strictTuples: false }).compile({
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

    it("NonEmptyArray", () => {
      expectJSONSchema(
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ a: "a" })).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
    })

    it("field + inner annotation", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      expect(validate({ a: "a", b: 1 })).toEqual(true)
      expect(validate({ a: "a" })).toEqual(true)
      expect(validate({})).toEqual(false)
      expect(validate({ b: 1 })).toEqual(false)
      expect(validate({ a: "a", b: 1, c: true })).toEqual(false)
    })

    it("exact optional field + inner annotation", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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
      expectJSONSchemaJsonSchemaAnnotations(
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

    describe("Pruning undefined and make the property optional by default", () => {
      it("optional field", () => {
        expectJSONSchemaJsonSchemaAnnotations(
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

      it("optional field + inner annotation", () => {
        expectJSONSchemaJsonSchemaAnnotations(
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

      it("optional field + outer annotation should override inner annotation", () => {
        expectJSONSchemaJsonSchemaAnnotations(
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
        expectJSONSchemaJsonSchemaAnnotations(
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
        expectJSONSchemaJsonSchemaAnnotations(
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
        expectJSONSchemaJsonSchemaAnnotations(
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

      it("UndefinedOr + outer annotation whould override inner annotations", () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Struct({
            a: Schema.propertySignature(Schema.UndefinedOr(Schema.String.annotations({ description: "inner" })))
              .annotations({ description: "outer" })
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

      it("With a custom jsonSchema annotation the property should remain required", () => {
        expectJSONSchemaOnly(
          Schema.Struct({
            a: Schema.UndefinedOr(Schema.String).annotations({ jsonSchema: { "type": "string" } })
          }),
          {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "additionalProperties": false
          }
        )
      })

      it("OptionFromUndefinedOr", () => {
        expectJSONSchemaJsonSchemaAnnotations(
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
        expectJSONSchemaJsonSchemaAnnotations(
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

  describe("Record", () => {
    it("Record(refinement, number)", () => {
      expectJSONSchemaJsonSchemaAnnotations(
        Schema.Record({ key: Schema.String.pipe(Schema.minLength(1)), value: JsonNumber }),
        {
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Record({ key: Schema.String, value: JsonNumber }), {
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
      expectJSONSchemaJsonSchemaAnnotations(
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
          "": { type: "number" }
        },
        "propertyNames": {
          "pattern": "^.*-.*$",
          "type": "string"
        }
      }
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
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
      expectJSONSchemaJsonSchemaAnnotations(schema, jsonSchema)
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
      expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.String, JsonNumber), {
        "anyOf": [
          { "type": "string" },
          { "type": "number" }
        ]
      })
    })

    describe("Union including literals", () => {
      it(`1 | 2`, () => {
        expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2)), {
          "enum": [1, 2]
        })
      })

      it(`1(with description) | 2`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.Literal(1).annotations({ description: "description" }), Schema.Literal(2)),
          {
            "anyOf": [
              { "enum": [1], "description": "description" },
              { "enum": [2] }
            ]
          }
        )
      })

      it(`1 | 2(with description)`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.Literal(1), Schema.Literal(2).annotations({ description: "description" })),
          {
            "anyOf": [
              { "enum": [1] },
              { "enum": [2], "description": "description" }
            ]
          }
        )
      })

      it(`1 | 2 | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2), Schema.String), {
          "anyOf": [
            { "enum": [1, 2] },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2) | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.Literal(1, 2), Schema.String), {
          "anyOf": [
            { "enum": [1, 2] },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2)(with description) | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.Literal(1, 2).annotations({ description: "description" }), Schema.String),
          {
            "anyOf": [
              { "enum": [1, 2], "description": "description" },
              { "type": "string" }
            ]
          }
        )
      })

      it(`(1 | 2)(with description) | 3 | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1, 2).annotations({ description: "description" }),
            Schema.Literal(3),
            Schema.String
          ),
          {
            "anyOf": [
              { "enum": [1, 2], "description": "description" },
              { "enum": [3] },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1(with description) | 2 | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.Literal(1).annotations({ description: "description" }), Schema.Literal(2), Schema.String),
          {
            "anyOf": [
              { "enum": [1], "description": "description" },
              { "enum": [2] },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1 | 2(with description) | string`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.Literal(1), Schema.Literal(2).annotations({ description: "description" }), Schema.String),
          {
            "anyOf": [
              { "enum": [1] },
              { "enum": [2], "description": "description" },
              { "type": "string" }
            ]
          }
        )
      })

      it(`string | 1 | 2 `, () => {
        expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1), Schema.Literal(2)), {
          "anyOf": [
            { "type": "string" },
            { "enum": [1, 2] }
          ]
        })
      })

      it(`string | (1 | 2) `, () => {
        expectJSONSchemaJsonSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1, 2)), {
          "anyOf": [
            { "type": "string" },
            { "enum": [1, 2] }
          ]
        })
      })

      it(`string | 1(with description) | 2`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.String, Schema.Literal(1).annotations({ description: "description" }), Schema.Literal(2)),
          {
            "anyOf": [
              { "type": "string" },
              { "enum": [1], "description": "description" },
              { "enum": [2] }
            ]
          }
        )
      })

      it(`string | 1 | 2(with description)`, () => {
        expectJSONSchemaJsonSchemaAnnotations(
          Schema.Union(Schema.String, Schema.Literal(1), Schema.Literal(2).annotations({ description: "description" })),
          {
            "anyOf": [
              { "type": "string" },
              { "enum": [1] },
              { "enum": [2], "description": "description" }
            ]
          }
        )
      })
    })

    it("union of literals with identifier", () => {
      expectJSONSchemaJsonSchemaAnnotations(
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

  describe("Transformation", () => {
    it("NumberFromString", () => {
      expectJSONSchema(Schema.NumberFromString, {
        "type": "string",
        "description": "a string that will be parsed into a number"
      })
    })

    it("DateFromString", () => {
      expectJSONSchema(
        Schema.DateFromString,
        {
          "type": "string",
          "description": "a string that will be parsed into a Date"
        }
      )
    })

    it("Date", () => {
      expectJSONSchema(
        Schema.Date,
        {
          "type": "string",
          "description": "a string that will be parsed into a Date"
        }
      )
    })

    it("OptionFromNullOr", () => {
      expectJSONSchemaJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.OptionFromNullOr(Schema.NonEmptyString)
        }),
        {
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

    it("ReadonlyMapFromRecord", () => {
      expectJSONSchema(
        Schema.ReadonlyMapFromRecord({
          key: Schema.String.pipe(Schema.minLength(2)),
          value: Schema.NumberFromString
        }),
        {
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

    describe("TypeLiteralTransformations", () => {
      describe("manual TypeLiteralTransformation", () => {
        it("an identifier annotation on the transformation should not overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([], [], { [AST.IdentifierAnnotationId]: "IDFrom" }),
              new AST.TypeLiteral([], []),
              new AST.TypeLiteralTransformation([]),
              { [AST.IdentifierAnnotationId]: "ID" }
            )
          )
          expectJSONSchema(schema, {
            "$ref": "#/$defs/IDFrom",
            "$defs": {
              "IDFrom": {
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
          expectJSONSchema(schema, {
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
          expectJSONSchema(schema, {
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
            expectJSONSchema(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }),
              {
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
                "additionalProperties": false
              }
            )
          })

          it("with property signature annotations", () => {
            const schema = Schema.Struct({
              a: Schema.optionalWith(Schema.NonEmptyString.annotations({ description: "an optional field" }), {
                default: () => ""
              }).annotations({ description: "a required field" })
            })
            expectJSONSchema(schema, {
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
              "additionalProperties": false
            })
            expectJSONSchema(Schema.typeSchema(schema), {
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
              "additionalProperties": false
            })
            expectJSONSchema(Schema.encodedSchema(schema), {
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
            expectJSONSchema(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }).annotations({ description: "mydescription", title: "mytitle" }),
              {
                "type": "object",
                "description": "mydescription",
                "title": "mytitle",
                "required": [],
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

          it("with transformation identifier annotation", () => {
            expectJSONSchema(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
              }).annotations({ identifier: "myid", description: "mydescription", title: "mytitle" }),
              {
                "$ref": "#/$defs/myid",
                "$defs": {
                  "myid": {
                    "type": "object",
                    "description": "mydescription",
                    "title": "mytitle",
                    "required": [],
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
                }
              }
            )
          })
        })

        describe(`{ as: "Option" } option`, () => {
          it("base", () => {
            expectJSONSchema(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }),
              {
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
                "additionalProperties": false
              }
            )
          })

          it("with transformation identifier annotation", () => {
            expectJSONSchema(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }).annotations({ identifier: "myid", description: "mydescription", title: "mytitle" }),
              {
                "$ref": "#/$defs/myid",
                "$defs": {
                  "myid": {
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
                    "description": "mydescription",
                    "title": "mytitle"
                  }
                }
              }
            )
          })
        })
      })

      describe("fromKey", () => {
        it("base", () => {
          expectJSONSchema(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }),
            {
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
              "additionalProperties": false
            }
          )
        })

        it("with transformation identifier annotation", () => {
          expectJSONSchema(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }).annotations({ identifier: "myid", description: "mydescription", title: "mytitle" }),
            {
              "$ref": "#/$defs/myid",
              "$defs": {
                "myid": {
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
                  "description": "mydescription",
                  "title": "mytitle"
                }
              }
            }
          )
        })
      })
    })
  })

  describe("Schema.parseJson", () => {
    it(`should correctly generate JSON Schemas by targeting the "to" side of transformations`, () => {
      expectJSONSchemaOnly(
        // Define a schema that parses a JSON string into a structured object
        Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString) // Nested parsing from JSON string to number
        })),
        {
          type: "object",
          required: ["a"],
          properties: {
            a: {
              "type": "string",
              "description": "a string that will be parsed into a number"
            }
          },
          additionalProperties: false
        }
      )
    })

    it("Schema.parseJson + TypeLiteralTransformations", () => {
      expectJSONSchemaOnly(
        Schema.parseJson(Schema.Struct({
          a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
        })),
        {
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
      ).annotations({ identifier: "A" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
        as: Schema.Array(Schema.suspend((): Schema.Schema<A> => schema).annotations({ identifier: "A" }))
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
      }).annotations({ identifier: "Category" })
      const jsonSchema: JSONSchema.JsonSchema7Root = {
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
    expectJSONSchemaJsonSchemaAnnotations(Schema.String.annotations({ examples: ["a", "b"] }), {
      "type": "string",
      "examples": ["a", "b"]
    })
  })

  it("default JSON Schema annotation support", () => {
    expectJSONSchemaJsonSchemaAnnotations(Schema.String.annotations({ default: "" }), {
      "type": "string",
      "default": ""
    })
  })

  describe("Class", () => {
    it("should generate the same JSON Schema as Schema.encodedSchema(Class)", () => {
      class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
      expectJSONSchema(A, {
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
    expectJSONSchemaJsonSchemaAnnotations(
      Schema.Struct({
        a: Schema.NonEmptyString.pipe(Schema.compose(Schema.NumberFromString))
      }),
      {
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

  describe("extend", () => {
    it("should correctly generate JSON Schemas for a schema created by extending two refinements", () => {
      // TODO: why expectJSONSchemaJsonSchemaAnnotations raises an error?
      expectJSONSchema(
        Schema.Struct({
          a: Schema.String
        }).pipe(Schema.filter(() => true, { jsonSchema: { description: "a" } })).pipe(Schema.extend(
          Schema.Struct({
            b: JsonNumber
          }).pipe(Schema.filter(() => true, { jsonSchema: { title: "b" } }))
        )),
        {
          "additionalProperties": false,
          "description": "a",
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "number" }
          },
          "required": ["a", "b"],
          "title": "b",
          "type": "object"
        }
      )
    })
  })

  describe("identifier annotation support", () => {
    it("String", () => {
      expectJSONSchema(Schema.String.annotations({ identifier: "Name" }), {
        "$ref": "#/$defs/Name",
        "$defs": {
          "Name": {
            "type": "string"
          }
        }
      })
    })

    describe("Struct", () => {
      it("self annotation", () => {
        expectJSONSchema(
          Schema.Struct({
            a: Schema.String
          }).annotations({ identifier: "Self" }),
          {
            "$defs": {
              "Self": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "$ref": "#/$defs/Self"
          }
        )
      })

      it("field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "Name",
          description: "a name",
          title: "Name"
        })
        const schema = Schema.Struct({
          a: Name
        })
        expectJSONSchema(schema, {
          "$defs": {
            "Name": {
              "type": "string",
              "description": "a name",
              "title": "Name"
            }
          },
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": {
              "$ref": "#/$defs/Name"
            }
          },
          "additionalProperties": false
        })
      })

      it("self annotation + field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "Name",
          description: "a name",
          title: "Name"
        })
        expectJSONSchema(
          Schema.Struct({
            a: Name
          }).annotations({ identifier: "Self" }),
          {
            "$defs": {
              "Self": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "$ref": "#/$defs/Name" }
                },
                "additionalProperties": false
              },
              "Name": {
                "type": "string",
                "description": "a name",
                "title": "Name"
              }
            },
            "$ref": "#/$defs/Self"
          }
        )
      })

      it("deeply nested field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "Name",
          description: "a name",
          title: "Name"
        })
        const schema = Schema.Struct({ a: Name, b: Schema.Struct({ c: Name }) })
        expectJSONSchema(schema, {
          "$defs": {
            "Name": {
              "type": "string",
              "description": "a name",
              "title": "Name"
            }
          },
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": {
              "$ref": "#/$defs/Name"
            },
            "b": {
              "type": "object",
              "required": ["c"],
              "properties": {
                "c": { "$ref": "#/$defs/Name" }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        })
      })
    })

    it("should borrow the identifier annotation when generating a schema through `encodedSchema()`", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }

      const schema: Schema.Schema<Category> = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(Schema.suspend(() => schema).annotations({ identifier: "Category" }))
      })

      expectJSONSchemaOnly(Schema.encodedSchema(schema), {
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

  describe("surrogate annotation support", () => {
    describe("Class", () => {
      it("should support typeSchema(Class)", () => {
        class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
        expectJSONSchema(Schema.typeSchema(A), {
          "$defs": {
            "A": {
              "type": "object",
              "required": ["a"],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false,
              "description": "an instance of A",
              "title": "A"
            }
          },
          "$ref": "#/$defs/A"
        })
        expectJSONSchema(
          Schema.typeSchema(A).annotations({
            description: "mydescription",
            title: "mytitle"
          }),
          {
            "$defs": {
              "A": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": {
                    "type": "string"
                  }
                },
                "additionalProperties": false,
                "description": "mydescription",
                "title": "mytitle"
              }
            },
            "$ref": "#/$defs/A"
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
        class A extends Schema.Class<A>("A")({ a: Schema.String }, {
          jsonSchema: { "type": "custom JSON Schema" }
        }) {}
        expectJSONSchemaOnly(Schema.typeSchema(A), {
          "$defs": {
            "A": {
              "type": "custom JSON Schema"
            }
          },
          "$ref": "#/$defs/A"
        })
      })
    })

    it("Void", () => {
      expectJSONSchemaOnly(Schema.Void.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Never", () => {
      expectJSONSchemaOnly(Schema.Never.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Literal", () => {
      expectJSONSchemaOnly(Schema.Literal("a").annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("SymbolFromSelf", () => {
      expectJSONSchemaOnly(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("UniqueSymbolFromSelf", () => {
      expectJSONSchemaOnly(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "type": "custom JSON Schema"
        }
      )
    })

    it("TemplateLiteral", () => {
      expectJSONSchemaOnly(
        Schema.TemplateLiteral(Schema.Literal("a"), Schema.String, Schema.Literal("b")).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "type": "custom JSON Schema"
        }
      )
    })

    it("Undefined", () => {
      expectJSONSchemaOnly(Schema.Undefined.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Unknown", () => {
      expectJSONSchemaOnly(Schema.Unknown.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Any", () => {
      expectJSONSchemaOnly(Schema.Any.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Object", () => {
      expectJSONSchemaOnly(Schema.Object.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("String", () => {
      expectJSONSchemaOnly(
        Schema.String.annotations({
          jsonSchema: { "type": "custom JSON Schema", "description": "description" }
        }),
        {
          "type": "custom JSON Schema",
          "description": "description"
        }
      )
    })

    it("Number", () => {
      expectJSONSchemaOnly(Schema.Number.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("BigintFromSelf", () => {
      expectJSONSchemaOnly(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Boolean", () => {
      expectJSONSchemaOnly(Schema.Boolean.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchemaOnly(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("Tuple", () => {
      expectJSONSchemaOnly(
        Schema.Tuple(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "type": "custom JSON Schema"
        }
      )
    })

    it("Struct", () => {
      expectJSONSchemaOnly(
        Schema.Struct({ a: Schema.String, b: JsonNumber }).annotations({
          jsonSchema: { "type": "custom JSON Schema" }
        }),
        {
          "type": "custom JSON Schema"
        }
      )
    })

    it("Union", () => {
      expectJSONSchemaOnly(
        Schema.Union(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom JSON Schema" } }),
        {
          "type": "custom JSON Schema"
        }
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
          Schema.suspend((): Schema.Schema<A> => schema).annotations({ jsonSchema: { "type": "custom JSON Schema" } })
        )
      })

      expectJSONSchemaOnly(schema, {
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
      })
    })

    it("refinement", () => {
      expectJSONSchemaOnly(Schema.Int.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "description": "an integer",
        "title": "Int",
        "type": "custom JSON Schema"
      })
    })

    it("transformation", () => {
      expectJSONSchemaOnly(Schema.NumberFromString.annotations({ jsonSchema: { "type": "custom JSON Schema" } }), {
        "type": "custom JSON Schema"
      })
    })

    it("refinement of a transformation with an override annotation", () => {
      expectJSONSchemaOnly(Schema.Date.annotations({ jsonSchema: { type: "string", format: "date-time" } }), {
        "format": "date-time",
        "type": "string"
      })
      expectJSONSchemaOnly(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        { anyOf: [{ type: "object" }, { type: "array" }] }
      )
      expectJSONSchemaOnly(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        { anyOf: [{ type: "object" }, { type: "array" }] }
      )
      expectJSONSchemaOnly(Schema.Date.annotations({ jsonSchema: { $ref: "x" } }), {
        $ref: "x"
      })
      expectJSONSchemaOnly(Schema.Date.annotations({ jsonSchema: { const: 1 } }), {
        const: 1
      })
      expectJSONSchemaOnly(Schema.Date.annotations({ jsonSchema: { enum: [1] } }), {
        enum: [1]
      })
    })

    it("refinement of a transformation without an override annotation", () => {
      expectJSONSchemaOnly(Schema.Trim.pipe(Schema.nonEmptyString()), {
        "type": "string",
        "description": "a string that will be trimmed"
      })
      expectJSONSchemaOnly(Schema.Trim.pipe(Schema.nonEmptyString({ jsonSchema: { title: "Description" } })), {
        "type": "string",
        "description": "a string that will be trimmed"
      })
      expectJSONSchemaOnly(
        Schema.Trim.pipe(Schema.nonEmptyString()).annotations({ jsonSchema: { title: "Description" } }),
        {
          "type": "string",
          "description": "a string that will be trimmed"
        }
      )
    })
  })
})
