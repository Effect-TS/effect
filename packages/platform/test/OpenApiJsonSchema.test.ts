import * as JSONSchema from "@effect/platform/OpenApiJsonSchema"
import Ajv from "ajv/dist/2019.js"
import * as A from "effect/Arbitrary"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

type Root = JSONSchema.Root

const ajvOptions: Ajv.Options = {
  strictTuples: false,
  allowMatchingProperties: true
}

const getAjvValidate = (jsonSchema: Root): Ajv.ValidateFunction =>
  // new instance of Ajv is created for each schema to avoid error: "schema with key or id "/schemas/any" already exists"
  new Ajv.default(ajvOptions).compile(jsonSchema)

const expectProperty = <A, I>(
  schema: Schema.Schema<A, I>,
  jsonSchema: Root,
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
  expect(jsonSchema).toStrictEqual(expected)
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

describe("parseJson", () => {
  it(`should correctly generate JSON Schemas by targeting the "to" side of transformations`, () => {
    const schema = Schema.parseJson(Schema.Struct({
      a: Schema.parseJson(Schema.NumberFromString)
    }))
    expectJSONSchema(
      schema,
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
    const jsonSchema: Root = {
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
    const jsonSchema: Root = {
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
    const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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

    describe("TypeLiteralTransformation", () => {
      it("a title annotation on the transformation should not overwrite an annotation set on the from part", () => {
        const schema = Schema.make(
          new AST.Transformation(
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.TitleAnnotationId]: "37f2e3af-6610-4ac3-a4c3-beaef52968eb"
            }),
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.TitleAnnotationId]: "3b536202-f423-43e7-898a-154352a49bb8"
            }),
            new AST.TypeLiteralTransformation([]),
            { [AST.TitleAnnotationId]: "4165c953-db36-4e85-a834-e48f2378a4b6" }
          )
        )
        expectJSONSchemaProperty(schema, {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false,
          "title": "37f2e3af-6610-4ac3-a4c3-beaef52968eb"
        })
      })

      it("a description annotation on the transformation should not overwrite an annotation set on the from part", () => {
        const schema = Schema.make(
          new AST.Transformation(
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.DescriptionAnnotationId]: "5fb557a4-1a98-461c-b72b-e826ff0ceede"
            }),
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.DescriptionAnnotationId]: "328d0f5d-7947-4659-84b9-f44639575976"
            }),
            new AST.TypeLiteralTransformation([]),
            { [AST.DescriptionAnnotationId]: "7261dcd6-17a3-4d43-9dd6-69806e22ec46" }
          )
        )
        expectJSONSchemaProperty(schema, {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false,
          "description": "5fb557a4-1a98-461c-b72b-e826ff0ceede"
        })
      })

      describe("optionalWith", () => {
        describe(`{ default: () => ... } option`, () => {
          it("with transformation description and title", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(
                  Schema.NonEmptyString.annotations({
                    description: "inner-description",
                    title: "inner-title"
                  }),
                  { default: () => "" }
                ).annotations({
                  description: "middle-description",
                  title: "middle-title"
                })
              }).annotations({
                description: "outer-description",
                title: "outer-title"
              }),
              {
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "description": "inner-description",
                    "title": "inner-title",
                    "minLength": 1
                  }
                },
                "type": "object",
                "description": "outer-description",
                "title": "outer-title",
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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
      const jsonSchema: Root = {
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

      const jsonSchema: Root = {
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
    it("should use the identifier as JSON Schema identifier", () => {
      const input = Schema.Struct({ a: Schema.String })
      class A extends Schema.Class<A>("7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95")(input) {}
      expectJSONSchemaProperty(A, {
        "$defs": {
          "7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95": {
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
          }
        },
        "$ref": "#/$defs/7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95"
      })
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
      expectJsonSchemaAnnotations(
        Schema.Struct({
          a: Schema.String
        }).pipe(
          Schema.filter(() => true, {
            jsonSchema: { "c5052c04-d6c9-44f3-9c8f-ede707d6ce38": "c5052c04-d6c9-44f3-9c8f-ede707d6ce38" }
          })
        )
          .pipe(Schema.extend(
            Schema.Struct({
              b: JsonNumber
            }).pipe(
              Schema.filter(() => true, {
                jsonSchema: { "940b4ea4-6313-4b59-9e64-ff7a41b8eb15": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15" }
              })
            )
          )),
        {
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "number" }
          },
          "c5052c04-d6c9-44f3-9c8f-ede707d6ce38": "c5052c04-d6c9-44f3-9c8f-ede707d6ce38",
          "940b4ea4-6313-4b59-9e64-ff7a41b8eb15": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15",
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

    describe("Transformation", () => {
      describe("TypeLiteralTransformation", () => {
        it("an identifier annotation on the transformation should overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
                [AST.IdentifierAnnotationId]: "0f70b90b-b268-46c8-a5a3-035139ad9126"
              }),
              new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
                [AST.IdentifierAnnotationId]: "77bb2410-9cf3-47cf-af76-fa3be1a3c626"
              }),
              new AST.TypeLiteralTransformation([]),
              { [AST.IdentifierAnnotationId]: "18e1de28-a15e-4373-bd2f-d53903942656" }
            )
          )
          expectJSONSchemaProperty(schema, {
            "$defs": {
              "18e1de28-a15e-4373-bd2f-d53903942656": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "$ref": "#/$defs/18e1de28-a15e-4373-bd2f-d53903942656"
          })
        })

        it("with transformation description, title and identifier", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.optionalWith(
                Schema.NonEmptyString.annotations({
                  description: "inner-description",
                  title: "inner-title"
                }),
                { default: () => "" }
              ).annotations({
                description: "middle-description",
                title: "middle-title"
              })
            }).annotations({
              description: "outer-description",
              title: "outer-title",
              identifier: "75d9b539-eb6b-48d3-81dd-61176a9bce78"
            }),
            {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "description": "inner-description",
                  "title": "inner-title",
                  "minLength": 1
                },
                "75d9b539-eb6b-48d3-81dd-61176a9bce78": {
                  "type": "object",
                  "description": "outer-description",
                  "title": "outer-title",
                  "required": [],
                  "properties": {
                    "a": {
                      "$ref": "#/$defs/NonEmptyString"
                    }
                  },
                  "additionalProperties": false
                }
              },
              "$ref": "#/$defs/75d9b539-eb6b-48d3-81dd-61176a9bce78"
            }
          )
        })
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
              "additionalProperties": false
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
          jsonSchema: {
            "type": "custom",
            "description": "description",
            "format": "uuid"
          }
        }),
        {
          "type": "custom",
          "description": "description",
          "format": "uuid"
        }
      )
      expectJSONSchema(
        Schema.String.annotations({
          identifier: "630d10c4-7030-45e7-894d-2c0bf5acadcf",
          jsonSchema: { "type": "custom", "description": "description" }
        }),
        {
          "$defs": {
            "630d10c4-7030-45e7-894d-2c0bf5acadcf": {
              "type": "custom",
              "description": "description"
            }
          },
          "$ref": "#/$defs/630d10c4-7030-45e7-894d-2c0bf5acadcf"
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

    it("UUID", () => {
      expectJSONSchema(
        Schema.UUID,
        {
          "$defs": {
            "UUID": {
              "description": "a Universally Unique Identifier",
              "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
              "title": "UUID",
              "type": "string",
              "format": "uuid"
            }
          },
          "$ref": "#/$defs/UUID"
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
          Schema.String.pipe(Schema.filter(() => true, { jsonSchema: {} })).annotations({
            identifier: "230acf3d-b3b0-4c3e-8ccc-5ca089c80014"
          }),
          {
            "$ref": "#/$defs/230acf3d-b3b0-4c3e-8ccc-5ca089c80014",
            "$defs": {
              "230acf3d-b3b0-4c3e-8ccc-5ca089c80014": {
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

  describe("Schema.encodedBoundSchema / Schema.encodedSchema", () => {
    describe("borrowing the identifier", () => {
      describe("Declaration", () => {
        it("without inner transformation", () => {
          const schema = Schema.Chunk(Schema.String).annotations({ identifier: "72e47719-6e43-4498-abfb-b8d98b233e55" })
          const expected = {
            "$defs": {
              "72e47719-6e43-4498-abfb-b8d98b233e55": {
                "items": {
                  "type": "string"
                },
                "type": "array"
              }
            },
            "$ref": "#/$defs/72e47719-6e43-4498-abfb-b8d98b233e55"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformation", () => {
          const schema = Schema.Chunk(Schema.NumberFromString).annotations({
            identifier: "e4be2cb9-227a-4160-b4a6-d2e3db09eb24"
          })
          const expected = {
            "$defs": {
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              },
              "e4be2cb9-227a-4160-b4a6-d2e3db09eb24": {
                "items": {
                  "$ref": "#/$defs/NumberFromString"
                },
                "type": "array"
              }
            },
            "$ref": "#/$defs/e4be2cb9-227a-4160-b4a6-d2e3db09eb24"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Refinement", () => {
        it("without from transformation", () => {
          const schema = Schema.Trimmed
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
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
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "$defs": {
              "Trimmed": {
                "type": "string"
              }
            },
            "$ref": "#/$defs/Trimmed"
          })
        })

        it("with from transformation", () => {
          const schema = Schema.compose(Schema.String, Schema.Trimmed).annotations({
            identifier: "29840acc-99d1-41c6-82dd-31932521e7ea"
          })
          const expected = {
            "$defs": {
              "29840acc-99d1-41c6-82dd-31932521e7ea": {
                "type": "string"
              }
            },
            "$ref": "#/$defs/29840acc-99d1-41c6-82dd-31932521e7ea"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("a stable filter without inner transformations", () => {
          const schema = Schema.Array(Schema.NumberFromString).pipe(Schema.minItems(2)).annotations(
            { identifier: "7848c831-fa50-4e36-aee8-65d2648c0120" }
          )
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "$defs": {
              "7848c831-fa50-4e36-aee8-65d2648c0120": {
                "description": "an array of at least 2 items",
                "items": {
                  "$ref": "#/$defs/NumberFromString"
                },
                "minItems": 2,
                "type": "array"
              },
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              }
            },
            "$ref": "#/$defs/7848c831-fa50-4e36-aee8-65d2648c0120"
          })
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "$defs": {
              "7848c831-fa50-4e36-aee8-65d2648c0120": {
                "items": {
                  "$ref": "#/$defs/NumberFromString"
                },
                "type": "array"
              },
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              }
            },
            "$ref": "#/$defs/7848c831-fa50-4e36-aee8-65d2648c0120"
          })
        })

        it("a stable filter with inner transformations SHOULD NOT borrow the annotations, identifier included", () => {
          const schema = Schema.compose(Schema.Unknown, Schema.Array(Schema.String)).pipe(Schema.minItems(1))
          const expected = {
            "$id": "/schemas/unknown",
            "title": "unknown"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Tuple", () => {
        it("without inner transformations", () => {
          const schema = Schema.Tuple(Schema.String).annotations({
            identifier: "4d8bbca3-9462-4679-8ee6-e4e718711552"
          })
          const expected = {
            "$defs": {
              "4d8bbca3-9462-4679-8ee6-e4e718711552": {
                "additionalItems": false,
                "items": [{ "type": "string" }],
                "minItems": 1,
                "type": "array"
              }
            },
            "$ref": "#/$defs/4d8bbca3-9462-4679-8ee6-e4e718711552"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          const schema = Schema.Tuple(Schema.NumberFromString).annotations({
            identifier: "5f699d98-b193-4436-9ac5-145a532a2b4d"
          })
          const expected = {
            "$defs": {
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              },
              "5f699d98-b193-4436-9ac5-145a532a2b4d": {
                "additionalItems": false,
                "items": [{ "$ref": "#/$defs/NumberFromString" }],
                "minItems": 1,
                "type": "array"
              }
            },
            "$ref": "#/$defs/5f699d98-b193-4436-9ac5-145a532a2b4d"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Struct", () => {
        it("without inner transformations", () => {
          const schema = Schema.Struct({ a: Schema.String }).annotations({
            identifier: "c8d0663b-c41b-4b6f-8b6e-bff59afc87c3"
          })
          const expected = {
            "$defs": {
              "c8d0663b-c41b-4b6f-8b6e-bff59afc87c3": {
                "additionalProperties": false,
                "properties": {
                  "a": { "type": "string" }
                },
                "required": ["a"],
                "type": "object"
              }
            },
            "$ref": "#/$defs/c8d0663b-c41b-4b6f-8b6e-bff59afc87c3"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          const schema = Schema.Struct({ a: Schema.NumberFromString }).annotations({
            identifier: "bc516245-69d0-4671-82e1-8629a656e99a"
          })
          const expected = {
            "$defs": {
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              },
              "bc516245-69d0-4671-82e1-8629a656e99a": {
                "additionalProperties": false,
                "properties": {
                  "a": {
                    "$ref": "#/$defs/NumberFromString"
                  }
                },
                "required": ["a"],
                "type": "object"
              }
            },
            "$ref": "#/$defs/bc516245-69d0-4671-82e1-8629a656e99a"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Union", () => {
        it("without inner transformations", () => {
          const schema = Schema.Union(Schema.String, Schema.Number).annotations({
            identifier: "c0c853a6-9029-49d9-9a63-08aa542ec7da"
          })
          const expected = {
            "$defs": {
              "c0c853a6-9029-49d9-9a63-08aa542ec7da": {
                "anyOf": [
                  { "type": "string" },
                  { "type": "number" }
                ]
              }
            },
            "$ref": "#/$defs/c0c853a6-9029-49d9-9a63-08aa542ec7da"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          const schema = Schema.Union(Schema.String, Schema.NumberFromString).annotations({
            identifier: "a9c6e11c-e1a2-482e-9748-e0ce161b926a"
          })
          const expected = {
            "$defs": {
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              },
              "a9c6e11c-e1a2-482e-9748-e0ce161b926a": {
                "anyOf": [
                  { "type": "string" },
                  { "$ref": "#/$defs/NumberFromString" }
                ]
              }
            },
            "$ref": "#/$defs/a9c6e11c-e1a2-482e-9748-e0ce161b926a"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Suspend", () => {
        it("without inner transformations", () => {
          interface Category {
            readonly name: string
            readonly categories: ReadonlyArray<Category>
          }

          const schema: Schema.Schema<Category> = Schema.Struct({
            name: Schema.String,
            categories: Schema.Array(
              Schema.suspend(() => schema).annotations({ identifier: "9456cebc-bb96-4fe7-8766-cc1e0f0bb823" })
            )
          })

          const expected = {
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
                  "$ref": "#/$defs/9456cebc-bb96-4fe7-8766-cc1e0f0bb823"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "9456cebc-bb96-4fe7-8766-cc1e0f0bb823": {
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
                      "$ref": "#/$defs/9456cebc-bb96-4fe7-8766-cc1e0f0bb823"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          interface Category {
            readonly name: number
            readonly categories: ReadonlyArray<Category>
          }
          interface CategoryEncoded {
            readonly name: string
            readonly categories: ReadonlyArray<CategoryEncoded>
          }

          const schema: Schema.Schema<Category, CategoryEncoded> = Schema.Struct({
            name: Schema.NumberFromString,
            categories: Schema.Array(
              Schema.suspend(() => schema).annotations({ identifier: "1e7880a8-555c-46e9-8b58-500e441134bf" })
            )
          })

          const expected = {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "$ref": "#/$defs/NumberFromString"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/1e7880a8-555c-46e9-8b58-500e441134bf"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "NumberFromString": {
                "description": "a string that will be parsed into a number",
                "type": "string"
              },
              "1e7880a8-555c-46e9-8b58-500e441134bf": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "$ref": "#/$defs/NumberFromString"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/1e7880a8-555c-46e9-8b58-500e441134bf"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      it("Transformation", () => {
        const expected = {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string that will be parsed into a number"
            }
          },
          "$ref": "#/$defs/NumberFromString"
        }
        expectJSONSchemaProperty(Schema.encodedBoundSchema(Schema.NumberFromString), expected)
        expectJSONSchemaProperty(Schema.encodedSchema(Schema.NumberFromString), expected)
      })
    })
  })
})
