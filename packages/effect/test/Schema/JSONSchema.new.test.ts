import { assertFalse, assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import type { Options as AjvOptions } from "ajv"
import Ajv from "ajv"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import { describe, it } from "vitest"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ajv2020 = require("ajv/dist/2020")

const ajvOptions: Ajv.Options = {
  strictTuples: false,
  allowMatchingProperties: true
}

function getAjvValidate(jsonSchema: object): Ajv.ValidateFunction {
  return new Ajv.default(ajvOptions).compile(jsonSchema)
}

const baseAjvOptions: AjvOptions = {
  allErrors: true,
  strict: false, // warns/throws on unknown keywords depending on Ajv version
  validateSchema: true,
  code: { esm: true } // optional
}

const ajvDraft7 = new Ajv.default(baseAjvOptions)
const ajv2020 = new Ajv2020.default(baseAjvOptions)

const expectError = <A, I>(schema: Schema.Schema<A, I>, message: string) => {
  throws(() => JSONSchema.make(schema), new Error(message))
}

async function assertDraft7<A, I, R>(schema: Schema.Schema<A, I, R>, expected: object) {
  const jsonSchema = JSONSchema.make(schema)
  deepStrictEqual(jsonSchema, {
    "$schema": "http://json-schema.org/draft-07/schema#",
    ...expected
  } as any)
  const valid = ajvDraft7.validateSchema(jsonSchema)
  if (valid instanceof Promise) {
    await valid
  }
  strictEqual(ajvDraft7.errors, null)
  return jsonSchema
}

async function assertDraft201909<S extends Schema.Schema.All>(
  schema: S,
  expected: object
) {
  const definitions = {}
  const jsonSchema = JSONSchema.fromAST(schema.ast, {
    definitions,
    target: "jsonSchema2019-09"
  })
  deepStrictEqual(jsonSchema, expected)
  const valid = ajv2020.validateSchema(jsonSchema)
  if (valid instanceof Promise) {
    await valid
  }
  strictEqual(ajv2020.errors, null)
  return jsonSchema
}

async function assertOpenApi3_1<S extends Schema.Schema.All>(
  schema: S,
  expected: object
) {
  const definitions = {}
  const jsonSchema = JSONSchema.fromAST(schema.ast, {
    definitions,
    target: "openApi3.1"
  })
  deepStrictEqual(jsonSchema, expected)
  const valid = ajv2020.validateSchema(jsonSchema)
  if (valid instanceof Promise) {
    await valid
  }
  strictEqual(ajvDraft7.errors, null)
  return jsonSchema
}

async function assertDraft2020_12<S extends Schema.Schema.All>(
  schema: S,
  expected: object
) {
  const definitions = {}
  const jsonSchema = JSONSchema.fromAST(schema.ast, {
    definitions,
    target: "jsonSchema2020-12"
  })
  deepStrictEqual(jsonSchema, expected)
  const valid = ajv2020.validateSchema(jsonSchema)
  if (valid instanceof Promise) {
    await valid
  }
  strictEqual(ajv2020.errors, null)
  return jsonSchema
}

function assertAjvDraft7Success<S extends Schema.Schema.Any>(
  schema: S,
  input: S["Type"]
) {
  const jsonSchema = JSONSchema.make(schema)
  const validate = getAjvValidate(jsonSchema)
  assertTrue(validate(input))
}

function assertAjvDraft7Failure<S extends Schema.Schema.Any>(
  schema: S,
  input: unknown
) {
  const jsonSchema = JSONSchema.make(schema)
  const validate = getAjvValidate(jsonSchema)
  assertFalse(validate(input))
}

describe("JSONSchema", () => {
  describe("fromAST", () => {
    it("definitionsPath", () => {
      const schema = Schema.String.annotations({ identifier: "08368672-2c02-4d6d-92b0-dd0019b33a7b" })
      const definitions = {}
      const jsonSchema = JSONSchema.fromAST(schema.ast, {
        definitions,
        definitionPath: "#/components/schemas/"
      })
      deepStrictEqual(jsonSchema, {
        "$ref": "#/components/schemas/08368672-2c02-4d6d-92b0-dd0019b33a7b"
      })
      deepStrictEqual(definitions, {
        "08368672-2c02-4d6d-92b0-dd0019b33a7b": {
          "type": "string"
        }
      })
    })

    describe("topLevelReferenceStrategy", () => {
      describe(`"skip"`, () => {
        it("top level identifier", () => {
          const schema = Schema.String.annotations({ identifier: "1b205579-f159-48d4-a218-f09426bca040" })
          const definitions = {}
          const jsonSchema = JSONSchema.fromAST(schema.ast, {
            definitions,
            topLevelReferenceStrategy: "skip"
          })
          deepStrictEqual(jsonSchema, {
            "type": "string"
          })
          deepStrictEqual(definitions, {})
        })

        it("nested identifiers", () => {
          class A extends Schema.Class<A>("A")({ a: Schema.String.annotations({ identifier: "ID4" }) }) {}
          const schema = Schema.Struct({
            a: Schema.String.annotations({ identifier: "ID" }),
            b: Schema.Date,
            c: Schema.Struct({
              d: Schema.String.annotations({ identifier: "ID3" })
            }).annotations({ identifier: "ID2" }),
            e: A
          })
          const definitions = {}
          const jsonSchema = JSONSchema.fromAST(schema.ast, {
            definitions,
            topLevelReferenceStrategy: "skip"
          })
          deepStrictEqual(jsonSchema, {
            "type": "object",
            "properties": {
              "a": {
                "type": "string"
              },
              "b": {
                "type": "string",
                "description": "a string to be decoded into a Date"
              },
              "c": {
                "type": "object",
                "properties": {
                  "d": { "type": "string" }
                },
                "required": ["d"],
                "additionalProperties": false
              },
              "e": {
                "type": "object",
                "properties": {
                  "a": { "type": "string" }
                },
                "required": ["a"],
                "additionalProperties": false
              }
            },
            "required": ["a", "b", "c", "e"],
            "additionalProperties": false
          })
          deepStrictEqual(definitions, {})
        })

        it("suspended schema", () => {
          interface A {
            readonly a: string
            readonly as: ReadonlyArray<A>
          }
          const schema: Schema.Schema<A> = Schema.suspend(() =>
            Schema.Struct({
              a: Schema.String.annotations({ identifier: "ID2" }),
              as: Schema.Array(schema)
            })
          ).annotations({ identifier: "ID" })
          const definitions = {}
          const jsonSchema = JSONSchema.fromAST(schema.ast, {
            definitions,
            topLevelReferenceStrategy: "skip"
          })
          deepStrictEqual(jsonSchema, {
            "$ref": "#/$defs/ID"
          })
          deepStrictEqual(definitions, {
            "ID": {
              "type": "object",
              "properties": {
                "a": { "type": "string" },
                "as": { "type": "array", "items": { "$ref": "#/$defs/ID" } }
              },
              "required": ["a", "as"],
              "additionalProperties": false
            }
          })
        })
      })
    })

    describe("additionalPropertiesStrategy", () => {
      it(`"allow"`, () => {
        const schema = Schema.Struct({
          a: Schema.String,
          b: Schema.Struct({
            c: Schema.String
          })
        })
        const definitions = {}
        const jsonSchema = JSONSchema.fromAST(schema.ast, {
          definitions,
          additionalPropertiesStrategy: "allow"
        })
        deepStrictEqual(jsonSchema, {
          "type": "object",
          "properties": {
            "a": {
              "type": "string"
            },
            "b": {
              "type": "object",
              "properties": {
                "c": { "type": "string" }
              },
              "required": ["c"],
              "additionalProperties": true
            }
          },
          "required": ["a", "b"],
          "additionalProperties": true
        })
        deepStrictEqual(definitions, {})
      })
    })
  })

  describe("Unsupported schemas", () => {
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
        Schema.Struct({ a: Schema.SymbolFromSelf }),
        `Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
      )
    })

    it("Declaration", async () => {
      expectError(
        Schema.ChunkFromSelf(Schema.String),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): Chunk<string>`
      )
    })

    it("Undefined", async () => {
      expectError(
        Schema.Undefined,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
      )
    })

    it("BigIntFromSelf", async () => {
      expectError(
        Schema.BigIntFromSelf,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (BigIntKeyword): bigint`
      )
    })

    it("UniqueSymbolFromSelf", async () => {
      expectError(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UniqueSymbol): Symbol(effect/Schema/test/a)`
      )
    })

    it("SymbolFromSelf", async () => {
      expectError(
        Schema.SymbolFromSelf,
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
      )
    })

    it("Literal(bigint)", () => {
      expectError(
        Schema.Literal(1n),
        `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Literal): 1n`
      )
    })

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

    it("Unsupported property signature key", () => {
      const a = Symbol.for("effect/Schema/test/a")
      expectError(
        Schema.Struct({ [a]: Schema.String }),
        `Unsupported key
details: Cannot encode Symbol(effect/Schema/test/a) key to JSON Schema`
      )
    })

    it("Unsupported index signature parameter", () => {
      expectError(
        Schema.Record({ key: Schema.SymbolFromSelf, value: Schema.Number }),
        `Missing annotation
at path: ["[symbol]"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
      )
    })

    it("Unsupported post-rest elements", () => {
      expectError(
        Schema.Tuple([], Schema.Number, Schema.String),
        "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request"
      )
    })
  })

  describe("jsonSchema7", () => {
    describe("nullable handling", () => {
      it("Null", async () => {
        const schema = Schema.Null
        await assertDraft7(schema, { "type": "null" })
      })

      it("NullOr(String)", async () => {
        const schema = Schema.NullOr(Schema.String)
        await assertDraft7(schema, {
          "anyOf": [
            { "type": "string" },
            { "type": "null" }
          ]
        })
      })

      it("NullOr(Any)", async () => {
        const schema = Schema.NullOr(Schema.Any)
        await assertDraft7(schema, {
          "$id": "/schemas/any",
          "title": "any"
        })
      })

      it("NullOr(Unknown)", async () => {
        const schema = Schema.NullOr(Schema.Unknown)
        await assertDraft7(schema, {
          "$id": "/schemas/unknown",
          "title": "unknown"
        })
      })

      it("NullOr(Void)", async () => {
        const schema = Schema.NullOr(Schema.Void)
        await assertDraft7(schema, {
          "$id": "/schemas/void",
          "title": "void"
        })
      })

      it("Literal | null", async () => {
        const schema = Schema.Literal("a", null)
        await assertDraft7(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            { "type": "null" }
          ]
        })
      })

      it("Literal | null(with description)", async () => {
        const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
        await assertDraft7(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            {
              "type": "null",
              "description": "mydescription"
            }
          ]
        })
      })

      it("Nested nullable unions", async () => {
        const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
        await assertDraft7(schema, {
          "anyOf": [
            {
              "anyOf": [
                { "type": "string" },
                { "type": "null" }
              ]
            },
            {
              "anyOf": [
                { "type": "string", "enum": ["a"] },
                { "type": "null" }
              ]
            }
          ]
        })
      })
    })

    it("parseJson handling", async () => {
      const schema = Schema.parseJson(Schema.Struct({
        a: Schema.parseJson(Schema.NumberFromString)
      }))
      await assertDraft7(
        schema,
        {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": {
              "type": "string",
              "contentMediaType": "application/json"
            }
          },
          "additionalProperties": false
        }
      )
    })

    describe("primitives", () => {
      it("Never", async () => {
        await assertDraft7(Schema.Never, {
          "$id": "/schemas/never",
          "not": {},
          "title": "never"
        })
        await assertDraft7(Schema.Never.annotations({ description: "description" }), {
          "$id": "/schemas/never",
          "not": {},
          "title": "never",
          "description": "description"
        })
      })

      it("Void", async () => {
        await assertDraft7(Schema.Void, {
          "$id": "/schemas/void",
          "title": "void"
        })
        await assertDraft7(Schema.Void.annotations({ description: "description" }), {
          "$id": "/schemas/void",
          "title": "void",
          "description": "description"
        })
      })

      it("Unknown", async () => {
        await assertDraft7(Schema.Unknown, {
          "$id": "/schemas/unknown",
          "title": "unknown"
        })
        await assertDraft7(Schema.Unknown.annotations({ description: "description" }), {
          "$id": "/schemas/unknown",
          "title": "unknown",
          "description": "description"
        })
      })

      it("Any", async () => {
        await assertDraft7(Schema.Any, {
          "$id": "/schemas/any",
          "title": "any"
        })
        await assertDraft7(Schema.Any.annotations({ description: "description" }), {
          "$id": "/schemas/any",
          "title": "any",
          "description": "description"
        })
      })

      it("Object", async () => {
        await assertDraft7(Schema.Object, {
          "$id": "/schemas/object",
          "anyOf": [
            { "type": "object" },
            { "type": "array" }
          ],
          "title": "object",
          "description": "an object in the TypeScript meaning, i.e. the `object` type"
        })
        await assertDraft7(Schema.Object.annotations({ description: "description" }), {
          "$id": "/schemas/object",
          "anyOf": [
            { "type": "object" },
            { "type": "array" }
          ],
          "title": "object",
          "description": "description"
        })
      })

      it("String", async () => {
        const schema = Schema.String
        await assertDraft7(schema, {
          "type": "string"
        })
        await assertDraft7(schema.annotations({ description: "description" }), {
          "type": "string",
          "description": "description"
        })
        assertAjvDraft7Success(schema, "a")
        assertAjvDraft7Failure(schema, null)
      })

      it("Number", async () => {
        await assertDraft7(Schema.Number, {
          "type": "number"
        })
        await assertDraft7(Schema.Number.annotations({ description: "description" }), {
          "type": "number",
          "description": "description"
        })
      })

      it("Boolean", async () => {
        await assertDraft7(Schema.Boolean, {
          "type": "boolean"
        })
        await assertDraft7(Schema.Boolean.annotations({ description: "description" }), {
          "type": "boolean",
          "description": "description"
        })
      })
    })

    describe("Literal", () => {
      const schema = Schema.Literal(null)
      it("null literal", async () => {
        await assertDraft7(schema, {
          "type": "null"
        })
        await assertDraft7(schema.annotations({ description: "description" }), {
          "type": "null",
          "description": "description"
        })
        assertAjvDraft7Success(schema, null)
        assertAjvDraft7Failure(schema, "a")
      })

      it("string literal", async () => {
        await assertDraft7(Schema.Literal("a"), {
          "type": "string",
          "enum": ["a"]
        })
        await assertDraft7(Schema.Literal("a").annotations({ description: "description" }), {
          "type": "string",
          "enum": ["a"],
          "description": "description"
        })
      })

      it("number literal", async () => {
        await assertDraft7(Schema.Literal(1), {
          "type": "number",
          "enum": [1]
        })
        await assertDraft7(Schema.Literal(1).annotations({ description: "description" }), {
          "type": "number",
          "enum": [1],
          "description": "description"
        })
      })

      it("boolean literal", async () => {
        await assertDraft7(Schema.Literal(true), {
          "type": "boolean",
          "enum": [true]
        })
        await assertDraft7(Schema.Literal(true).annotations({ description: "description" }), {
          "type": "boolean",
          "enum": [true],
          "description": "description"
        })
      })
    })

    describe("Literals", () => {
      it("string literals", async () => {
        await assertDraft7(Schema.Literal("a", "b"), {
          "type": "string",
          "enum": ["a", "b"]
        })
      })

      it("number literals", async () => {
        await assertDraft7(Schema.Literal(1, 2), {
          "type": "number",
          "enum": [1, 2]
        })
      })

      it("boolean literals", async () => {
        await assertDraft7(Schema.Literal(true, false), {
          "type": "boolean",
          "enum": [true, false]
        })
      })

      it("mixed literals", async () => {
        await assertDraft7(Schema.Literal(1, "a", true), {
          "anyOf": [
            { "type": "number", "enum": [1] },
            { "type": "string", "enum": ["a"] },
            { "type": "boolean", "enum": [true] }
          ]
        })
        await assertDraft7(Schema.Literal("a", "b", 1), {
          "anyOf": [
            { "type": "string", "enum": ["a", "b"] },
            { "type": "number", "enum": [1] }
          ]
        })
        await assertDraft7(Schema.Literal("a", 1, "b"), {
          "anyOf": [
            { "type": "string", "enum": ["a"] },
            { "type": "number", "enum": [1] },
            { "type": "string", "enum": ["b"] }
          ]
        })
      })
    })

    describe("Enums", () => {
      it("empty enum", async () => {
        enum Empty {}
        await assertDraft7(Schema.Enums(Empty), {
          "$id": "/schemas/never",
          "not": {}
        })
        await assertDraft7(Schema.Enums(Empty).annotations({ description: "description" }), {
          "$id": "/schemas/never",
          "not": {},
          "description": "description"
        })
      })

      it("single enum", async () => {
        enum Fruits {
          Apple
        }
        await assertDraft7(Schema.Enums(Fruits), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "number", "title": "Apple", "enum": [0] }
          ]
        })
        await assertDraft7(Schema.Enums(Fruits).annotations({ description: "description" }), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "number", "title": "Apple", "enum": [0] }
          ],
          "description": "description"
        })
      })

      it("numeric enums", async () => {
        enum Fruits {
          Apple,
          Banana
        }
        await assertDraft7(Schema.Enums(Fruits), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "number", "title": "Apple", "enum": [0] },
            { "type": "number", "title": "Banana", "enum": [1] }
          ]
        })
      })

      it("string enums", async () => {
        enum Fruits {
          Apple = "apple",
          Banana = "banana"
        }
        await assertDraft7(Schema.Enums(Fruits), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "string", "title": "Apple", "enum": ["apple"] },
            { "type": "string", "title": "Banana", "enum": ["banana"] }
          ]
        })
      })

      it("mix of string/number enums", async () => {
        enum Fruits {
          Apple = "apple",
          Banana = "banana",
          Cantaloupe = 0
        }
        await assertDraft7(Schema.Enums(Fruits), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "string", "title": "Apple", "enum": ["apple"] },
            { "type": "string", "title": "Banana", "enum": ["banana"] },
            { "type": "number", "title": "Cantaloupe", "enum": [0] }
          ]
        })
      })

      it("const enums", async () => {
        const Fruits = {
          Apple: "apple",
          Banana: "banana",
          Cantaloupe: 3
        } as const
        await assertDraft7(Schema.Enums(Fruits), {
          "$comment": "/schemas/enums",
          "anyOf": [
            { "type": "string", "title": "Apple", "enum": ["apple"] },
            { "type": "string", "title": "Banana", "enum": ["banana"] },
            { "type": "number", "title": "Cantaloupe", "enum": [3] }
          ]
        })
      })
    })

    it("TemplateLiteral", async () => {
      const schema = Schema.TemplateLiteral(Schema.Literal("a"), Schema.Number)
      await assertDraft7(schema, {
        "type": "string",
        "pattern": "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$",
        "title": "`a${number}`",
        "description": "a template literal"
      })
    })

    describe("Refinement", () => {
      it("itemsCount (Array)", async () => {
        await assertDraft7(Schema.Array(Schema.String).pipe(Schema.itemsCount(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of exactly 2 item(s)",
          "title": "itemsCount(2)",
          "minItems": 2,
          "maxItems": 2
        })
      })

      it("itemsCount (NonEmptyArray)", async () => {
        await assertDraft7(Schema.NonEmptyArray(Schema.String).pipe(Schema.itemsCount(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of exactly 2 item(s)",
          "title": "itemsCount(2)",
          "minItems": 2,
          "maxItems": 2
        })
      })

      it("minItems (Array)", async () => {
        await assertDraft7(Schema.Array(Schema.String).pipe(Schema.minItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of at least 2 item(s)",
          "title": "minItems(2)",
          "minItems": 2
        })
      })

      it("minItems (NonEmptyArray)", async () => {
        await assertDraft7(Schema.NonEmptyArray(Schema.String).pipe(Schema.minItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of at least 2 item(s)",
          "title": "minItems(2)",
          "minItems": 2
        })
      })

      it("maxItems (Array)", async () => {
        await assertDraft7(Schema.Array(Schema.String).pipe(Schema.maxItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of at most 2 item(s)",
          "title": "maxItems(2)",
          "maxItems": 2
        })
      })

      it("maxItems (NonEmptyArray)", async () => {
        await assertDraft7(Schema.NonEmptyArray(Schema.String).pipe(Schema.maxItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of at most 2 item(s)",
          "title": "maxItems(2)",
          "minItems": 1,
          "maxItems": 2
        })
      })

      it("minLength", async () => {
        await assertDraft7(Schema.String.pipe(Schema.minLength(1)), {
          "type": "string",
          "title": "minLength(1)",
          "description": "a string at least 1 character(s) long",
          "minLength": 1
        })
      })

      it("maxLength", async () => {
        await assertDraft7(Schema.String.pipe(Schema.maxLength(1)), {
          "type": "string",
          "title": "maxLength(1)",
          "description": "a string at most 1 character(s) long",
          "maxLength": 1
        })
      })

      it("length: number", async () => {
        await assertDraft7(Schema.String.pipe(Schema.length(1)), {
          "type": "string",
          "title": "length(1)",
          "description": "a single character",
          "maxLength": 1,
          "minLength": 1
        })
      })

      it("length: { min, max }", async () => {
        await assertDraft7(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
          "type": "string",
          "title": "length({ min: 2, max: 4)",
          "description": "a string at least 2 character(s) and at most 4 character(s) long",
          "maxLength": 4,
          "minLength": 2
        })
      })

      it("greaterThan", async () => {
        await assertDraft7(Schema.Number.pipe(Schema.greaterThan(1)), {
          "type": "number",
          "title": "greaterThan(1)",
          "description": "a number greater than 1",
          "exclusiveMinimum": 1
        })
      })

      it("greaterThanOrEqualTo", async () => {
        await assertDraft7(Schema.Number.pipe(Schema.greaterThanOrEqualTo(1)), {
          "type": "number",
          "title": "greaterThanOrEqualTo(1)",
          "description": "a number greater than or equal to 1",
          "minimum": 1
        })
      })

      it("lessThan", async () => {
        await assertDraft7(Schema.Number.pipe(Schema.lessThan(1)), {
          "type": "number",
          "title": "lessThan(1)",
          "description": "a number less than 1",
          "exclusiveMaximum": 1
        })
      })

      it("lessThanOrEqualTo", async () => {
        await assertDraft7(Schema.Number.pipe(Schema.lessThanOrEqualTo(1)), {
          "type": "number",
          "title": "lessThanOrEqualTo(1)",
          "description": "a number less than or equal to 1",
          "maximum": 1
        })
      })

      it("pattern", async () => {
        await assertDraft7(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
          "type": "string",
          "description": "a string matching the pattern ^abb+$",
          "pattern": "^abb+$"
        })
      })

      it("int", async () => {
        await assertDraft7(Schema.Number.pipe(Schema.int()), {
          "type": "integer",
          "title": "int",
          "description": "an integer"
        })
      })

      it("Trimmed", async () => {
        const schema = Schema.Trimmed
        await assertDraft7(schema, {
          "$defs": {
            "Trimmed": {
              "title": "trimmed",
              "description": "a string with no leading or trailing whitespace",
              "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
              "type": "string"
            }
          },
          "$ref": "#/$defs/Trimmed"
        })
      })

      it("Lowercased", async () => {
        const schema = Schema.Lowercased
        await assertDraft7(schema, {
          "$defs": {
            "Lowercased": {
              "title": "lowercased",
              "description": "a lowercase string",
              "pattern": "^[^A-Z]*$",
              "type": "string"
            }
          },
          "$ref": "#/$defs/Lowercased"
        })
      })

      it("Uppercased", async () => {
        const schema = Schema.Uppercased
        await assertDraft7(schema, {
          "$defs": {
            "Uppercased": {
              "title": "uppercased",
              "description": "an uppercase string",
              "pattern": "^[^a-z]*$",
              "type": "string"
            }
          },
          "$ref": "#/$defs/Uppercased"
        })
      })

      it("Capitalized", async () => {
        const schema = Schema.Capitalized
        await assertDraft7(schema, {
          "$defs": {
            "Capitalized": {
              "title": "capitalized",
              "description": "a capitalized string",
              "pattern": "^[^a-z]?.*$",
              "type": "string"
            }
          },
          "$ref": "#/$defs/Capitalized"
        })
      })

      it("Uncapitalized", async () => {
        const schema = Schema.Uncapitalized
        await assertDraft7(schema, {
          "$defs": {
            "Uncapitalized": {
              "title": "uncapitalized",
              "description": "a uncapitalized string",
              "pattern": "^[^A-Z]?.*$",
              "type": "string"
            }
          },
          "$ref": "#/$defs/Uncapitalized"
        })
      })

      describe("should handle merge conflicts", () => {
        it("minLength + minLength", async () => {
          await assertDraft7(Schema.String.pipe(Schema.minLength(1), Schema.minLength(2)), {
            "type": "string",
            "title": "minLength(2)",
            "description": "a string at least 2 character(s) long",
            "minLength": 2
          })
          await assertDraft7(Schema.String.pipe(Schema.minLength(2), Schema.minLength(1)), {
            "type": "string",
            "title": "minLength(1)",
            "description": "a string at least 1 character(s) long",
            "minLength": 1,
            "allOf": [
              { "minLength": 2 }
            ]
          })
          await assertDraft7(Schema.String.pipe(Schema.minLength(2), Schema.minLength(1), Schema.minLength(2)), {
            "type": "string",
            "title": "minLength(2)",
            "description": "a string at least 2 character(s) long",
            "minLength": 2
          })
        })

        it("maxLength + maxLength", async () => {
          await assertDraft7(Schema.String.pipe(Schema.maxLength(1), Schema.maxLength(2)), {
            "type": "string",
            "title": "maxLength(2)",
            "description": "a string at most 2 character(s) long",
            "maxLength": 2,
            "allOf": [
              { "maxLength": 1 }
            ]
          })
          await assertDraft7(Schema.String.pipe(Schema.maxLength(2), Schema.maxLength(1)), {
            "type": "string",
            "title": "maxLength(1)",
            "description": "a string at most 1 character(s) long",
            "maxLength": 1
          })
          await assertDraft7(Schema.String.pipe(Schema.maxLength(1), Schema.maxLength(2), Schema.maxLength(1)), {
            "type": "string",
            "title": "maxLength(1)",
            "description": "a string at most 1 character(s) long",
            "maxLength": 1
          })
        })

        it("pattern + pattern", async () => {
          await assertDraft7(Schema.String.pipe(Schema.startsWith("a"), Schema.endsWith("c")), {
            "type": "string",
            "title": "endsWith(\"c\")",
            "description": "a string ending with \"c\"",
            "pattern": "^.*c$",
            "allOf": [
              { "pattern": "^a" }
            ]
          })
          await assertDraft7(
            Schema.String.pipe(Schema.startsWith("a"), Schema.endsWith("c"), Schema.startsWith("a")),
            {
              "type": "string",
              "title": "startsWith(\"a\")",
              "description": "a string starting with \"a\"",
              "pattern": "^a",
              "allOf": [
                { "pattern": "^.*c$" }
              ]
            }
          )
          await assertDraft7(
            Schema.String.pipe(Schema.endsWith("c"), Schema.startsWith("a"), Schema.endsWith("c")),
            {
              "type": "string",
              "title": "endsWith(\"c\")",
              "description": "a string ending with \"c\"",
              "pattern": "^.*c$",
              "allOf": [
                { "pattern": "^a" }
              ]
            }
          )
        })

        it("minItems + minItems", async () => {
          await assertDraft7(Schema.Array(Schema.String).pipe(Schema.minItems(1), Schema.minItems(2)), {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "an array of at least 2 item(s)",
            "title": "minItems(2)",
            "minItems": 2
          })
          await assertDraft7(Schema.Array(Schema.String).pipe(Schema.minItems(2), Schema.minItems(1)), {
            "type": "array",
            "items": {
              "type": "string"
            },
            "title": "minItems(1)",
            "description": "an array of at least 1 item(s)",
            "minItems": 1,
            "allOf": [
              { "minItems": 2 }
            ]
          })
          await assertDraft7(
            Schema.Array(Schema.String).pipe(Schema.minItems(2), Schema.minItems(1), Schema.minItems(2)),
            {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "an array of at least 2 item(s)",
              "title": "minItems(2)",
              "minItems": 2
            }
          )
        })

        it("maxItems + maxItems", async () => {
          await assertDraft7(Schema.Array(Schema.String).pipe(Schema.maxItems(1), Schema.maxItems(2)), {
            "type": "array",
            "items": {
              "type": "string"
            },
            "title": "maxItems(2)",
            "description": "an array of at most 2 item(s)",
            "maxItems": 2,
            "allOf": [
              { "maxItems": 1 }
            ]
          })
          await assertDraft7(Schema.Array(Schema.String).pipe(Schema.maxItems(2), Schema.maxItems(1)), {
            "type": "array",
            "items": {
              "type": "string"
            },
            "title": "maxItems(1)",
            "description": "an array of at most 1 item(s)",
            "maxItems": 1
          })
          await assertDraft7(
            Schema.Array(Schema.String).pipe(Schema.maxItems(1), Schema.maxItems(2), Schema.maxItems(1)),
            {
              "type": "array",
              "items": {
                "type": "string"
              },
              "title": "maxItems(1)",
              "description": "an array of at most 1 item(s)",
              "maxItems": 1
            }
          )
        })

        it("minimum + minimum", async () => {
          await assertDraft7(Schema.Number.pipe(Schema.greaterThanOrEqualTo(1), Schema.greaterThanOrEqualTo(2)), {
            "type": "number",
            "title": "greaterThanOrEqualTo(2)",
            "description": "a number greater than or equal to 2",
            "minimum": 2
          })
          await assertDraft7(Schema.Number.pipe(Schema.greaterThanOrEqualTo(2), Schema.greaterThanOrEqualTo(1)), {
            "type": "number",
            "minimum": 1,
            "title": "greaterThanOrEqualTo(1)",
            "description": "a number greater than or equal to 1",
            "allOf": [
              { "minimum": 2 }
            ]
          })
          await assertDraft7(
            Schema.Number.pipe(
              Schema.greaterThanOrEqualTo(2),
              Schema.greaterThanOrEqualTo(1),
              Schema.greaterThanOrEqualTo(2)
            ),
            {
              "type": "number",
              "title": "greaterThanOrEqualTo(2)",
              "description": "a number greater than or equal to 2",
              "minimum": 2
            }
          )
        })

        it("maximum + maximum", async () => {
          await assertDraft7(Schema.Number.pipe(Schema.lessThanOrEqualTo(1), Schema.lessThanOrEqualTo(2)), {
            "type": "number",
            "title": "lessThanOrEqualTo(2)",
            "description": "a number less than or equal to 2",
            "maximum": 2,
            "allOf": [
              { "maximum": 1 }
            ]
          })
          await assertDraft7(Schema.Number.pipe(Schema.lessThanOrEqualTo(2), Schema.lessThanOrEqualTo(1)), {
            "type": "number",
            "title": "lessThanOrEqualTo(1)",
            "description": "a number less than or equal to 1",
            "maximum": 1
          })
          await assertDraft7(
            Schema.Number.pipe(Schema.lessThanOrEqualTo(1), Schema.lessThanOrEqualTo(2), Schema.lessThanOrEqualTo(1)),
            {
              "type": "number",
              "title": "lessThanOrEqualTo(1)",
              "description": "a number less than or equal to 1",
              "maximum": 1
            }
          )
        })

        it("exclusiveMinimum + exclusiveMinimum", async () => {
          await assertDraft7(Schema.Number.pipe(Schema.greaterThan(1), Schema.greaterThan(2)), {
            "type": "number",
            "title": "greaterThan(2)",
            "description": "a number greater than 2",
            "exclusiveMinimum": 2
          })
          await assertDraft7(Schema.Number.pipe(Schema.greaterThan(2), Schema.greaterThan(1)), {
            "type": "number",
            "exclusiveMinimum": 1,
            "title": "greaterThan(1)",
            "description": "a number greater than 1",
            "allOf": [
              { "exclusiveMinimum": 2 }
            ]
          })
          await assertDraft7(
            Schema.Number.pipe(
              Schema.greaterThan(2),
              Schema.greaterThan(1),
              Schema.greaterThan(2)
            ),
            {
              "type": "number",
              "title": "greaterThan(2)",
              "description": "a number greater than 2",
              "exclusiveMinimum": 2
            }
          )
        })

        it("exclusiveMaximum + exclusiveMaximum", async () => {
          await assertDraft7(Schema.Number.pipe(Schema.lessThan(1), Schema.lessThan(2)), {
            "type": "number",
            "title": "lessThan(2)",
            "description": "a number less than 2",
            "exclusiveMaximum": 2,
            "allOf": [
              { "exclusiveMaximum": 1 }
            ]
          })
          await assertDraft7(Schema.Number.pipe(Schema.lessThan(2), Schema.lessThan(1)), {
            "type": "number",
            "title": "lessThan(1)",
            "description": "a number less than 1",
            "exclusiveMaximum": 1
          })
          await assertDraft7(
            Schema.Number.pipe(Schema.lessThan(1), Schema.lessThan(2), Schema.lessThan(1)),
            {
              "type": "number",
              "title": "lessThan(1)",
              "description": "a number less than 1",
              "exclusiveMaximum": 1
            }
          )
        })

        it("multipleOf + multipleOf", async () => {
          await assertDraft7(Schema.Number.pipe(Schema.multipleOf(2), Schema.multipleOf(3)), {
            "type": "number",
            "title": "multipleOf(3)",
            "description": "a number divisible by 3",
            "multipleOf": 3,
            "allOf": [
              { "multipleOf": 2 }
            ]
          })
          await assertDraft7(
            Schema.Number.pipe(Schema.multipleOf(2), Schema.multipleOf(3), Schema.multipleOf(3)),
            {
              "type": "number",
              "title": "multipleOf(3)",
              "description": "a number divisible by 3",
              "multipleOf": 3,
              "allOf": [
                { "multipleOf": 2 }
              ]
            }
          )
          await assertDraft7(
            Schema.Number.pipe(Schema.multipleOf(3), Schema.multipleOf(2), Schema.multipleOf(3)),
            {
              "type": "number",
              "title": "multipleOf(3)",
              "description": "a number divisible by 3",
              "multipleOf": 3,
              "allOf": [
                { "multipleOf": 2 }
              ]
            }
          )
        })
      })
    })

    describe("Tuple", () => {
      it("empty tuple", async () => {
        const schema = Schema.Tuple()
        await assertDraft7(schema, {
          "type": "array",
          "maxItems": 0
        })
      })

      it("element", async () => {
        const schema = Schema.Tuple(Schema.Number)
        await assertDraft7(schema, {
          "type": "array",
          "items": [{
            "type": "number"
          }],
          "minItems": 1,
          "additionalItems": false
        })
      })

      it("element + inner annotations", async () => {
        await assertDraft7(
          Schema.Tuple(Schema.Number.annotations({ description: "inner" })),
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

      it("element + outer annotations should override inner annotations", async () => {
        await assertDraft7(
          Schema.Tuple(
            Schema.element(Schema.Number.annotations({ description: "inner" })).annotations({ description: "outer" })
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

      it("optionalElement", async () => {
        const schema = Schema.Tuple(Schema.optionalElement(Schema.Number))
        await assertDraft7(schema, {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "number"
            }
          ],
          "additionalItems": false
        })
      })

      it("optionalElement + inner annotations", async () => {
        await assertDraft7(
          Schema.Tuple(Schema.optionalElement(Schema.Number).annotations({ description: "inner" })),
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

      it("optionalElement + outer annotations should override inner annotations", async () => {
        await assertDraft7(
          Schema.Tuple(
            Schema.optionalElement(Schema.Number).annotations({ description: "inner" }).annotations({
              description: "outer"
            })
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

      it("element + optionalElement", async () => {
        const schema = Schema.Tuple(
          Schema.element(Schema.String.annotations({ description: "inner" })).annotations({ description: "outer" }),
          Schema.optionalElement(Schema.Number.annotations({ description: "inner?" })).annotations({
            description: "outer?"
          })
        )
        await assertDraft7(schema, {
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
        })
      })

      it("rest", async () => {
        const schema = Schema.Array(Schema.Number)
        await assertDraft7(schema, {
          "type": "array",
          "items": {
            "type": "number"
          }
        })
      })

      it("rest + inner annotations", async () => {
        await assertDraft7(Schema.Array(Schema.Number.annotations({ description: "inner" })), {
          "type": "array",
          "items": {
            "type": "number",
            "description": "inner"
          }
        })
      })

      it("optionalElement + rest + inner annotations", async () => {
        const schema = Schema.Tuple(
          [Schema.optionalElement(Schema.String)],
          Schema.element(Schema.Number.annotations({ description: "inner" }))
        )
        await assertDraft7(schema, {
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
        })
      })

      it("optionalElement + rest + outer annotations should override inner annotations", async () => {
        await assertDraft7(
          Schema.Tuple(
            [Schema.optionalElement(Schema.String)],
            Schema.element(Schema.Number.annotations({ description: "inner" })).annotations({ description: "outer" })
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

      it("element + rest", async () => {
        const schema = Schema.Tuple([Schema.String], Schema.Number)
        await assertDraft7(schema, {
          "type": "array",
          "items": [{
            "type": "string"
          }],
          "minItems": 1,
          "additionalItems": {
            "type": "number"
          }
        })
      })

      it("NonEmptyArray", async () => {
        await assertDraft7(
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
      it("empty struct: Schema.Struct({})", async () => {
        const schema = Schema.Struct({})
        await assertDraft7(schema, {
          "$id": "/schemas/%7B%7D",
          "anyOf": [{
            "type": "object"
          }, {
            "type": "array"
          }]
        })
      })

      it("required property signatures", async () => {
        const schema = Schema.Struct({
          a: Schema.String,
          b: Schema.String.annotations({ description: "b-inner" }),
          c: Schema.propertySignature(Schema.String).annotations({ description: "c-outer" }),
          d: Schema.propertySignature(Schema.String.annotations({ description: "d-inner" })).annotations({
            description: "d-outer"
          })
        })
        await assertDraft7(schema, {
          "type": "object",
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "string", "description": "b-inner" },
            "c": { "type": "string", "description": "c-outer" },
            "d": { "type": "string", "description": "d-outer" }
          },
          "required": ["a", "b", "c", "d"],
          "additionalProperties": false
        })
      })

      it("optional", async () => {
        const schema = Schema.Struct({
          a: Schema.optional(Schema.String),
          b: Schema.optional(Schema.String.annotations({ description: "b-inner" })),
          c: Schema.optional(Schema.String).annotations({ description: "c-outer" }),
          d: Schema.optional(Schema.String.annotations({ description: "d-inner" })).annotations({
            description: "d-outer"
          }),
          e: Schema.optional(Schema.UndefinedOr(Schema.String))
        })
        await assertDraft7(schema, {
          "type": "object",
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "string", "description": "b-inner" },
            "c": { "type": "string", "description": "c-outer" },
            "d": { "type": "string", "description": "d-outer" },
            "e": { "type": "string" }
          },
          "required": [],
          "additionalProperties": false
        })
      })

      describe("optionalWith", () => {
        it("{ nullable: true }", async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { nullable: true }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), { nullable: true }),
            c: Schema.optionalWith(Schema.String, { nullable: true }).annotations({ description: "c-outer" }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), { nullable: true })
              .annotations({
                description: "d-outer"
              }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { nullable: true })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
              "b": {
                "anyOf": [{ "type": "string", "description": "b-inner" }, { "type": "null" }],
                "description": "b-inner"
              },
              "c": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "c-outer" },
              "d": {
                "anyOf": [{ "type": "string", "description": "d-inner" }, { "type": "null" }],
                "description": "d-outer"
              },
              "e": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it("{ exact: true }", async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { exact: true }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), { exact: true }),
            c: Schema.optionalWith(Schema.String, { exact: true }).annotations({ description: "c-outer" }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), { exact: true }).annotations({
              description: "d-outer"
            }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { exact: true })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "type": "string" },
              "b": { "type": "string", "description": "b-inner" },
              "c": { "type": "string", "description": "c-outer" },
              "d": { "type": "string", "description": "d-outer" },
              "e": { "type": "string" }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it("{ exact: true, nullable: true }", async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { exact: true, nullable: true }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), {
              exact: true,
              nullable: true
            }),
            c: Schema.optionalWith(Schema.String, { exact: true, nullable: true }).annotations({
              description: "c-outer"
            }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), {
              exact: true,
              nullable: true
            }).annotations({
              description: "d-outer"
            }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { exact: true, nullable: true })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
              "b": {
                "anyOf": [{ "type": "string", "description": "b-inner" }, { "type": "null" }],
                "description": "b-inner"
              },
              "c": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "c-outer" },
              "d": {
                "anyOf": [{ "type": "string", "description": "d-inner" }, { "type": "null" }],
                "description": "d-outer"
              },
              "e": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it("{ default }", async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { default: () => "" }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), { default: () => "" }),
            c: Schema.optionalWith(Schema.String, { default: () => "" }).annotations({ description: "c-outer" }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), { default: () => "" })
              .annotations({ description: "d-outer" }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { default: () => "" })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "type": "string" },
              "b": { "type": "string", "description": "b-inner" },
              "c": { "type": "string", "description": "c-outer" },
              "d": { "type": "string", "description": "d-outer" },
              "e": { "type": "string" }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it("{ default, nullable: true }", async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { default: () => "", nullable: true }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), {
              default: () => "",
              nullable: true
            }),
            c: Schema.optionalWith(Schema.String, { default: () => "", nullable: true }).annotations({
              description: "c-outer"
            }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), {
              default: () => "",
              nullable: true
            })
              .annotations({ description: "d-outer" }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { default: () => "", nullable: true })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
              "b": {
                "anyOf": [{ "type": "string", "description": "b-inner" }, { "type": "null" }],
                "description": "b-inner"
              },
              "c": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "c-outer" },
              "d": {
                "anyOf": [{ "type": "string", "description": "d-inner" }, { "type": "null" }],
                "description": "d-outer"
              },
              "e": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it(`{ as: "Option" }`, async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { as: "Option" }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), { as: "Option" }),
            c: Schema.optionalWith(Schema.String, { as: "Option" }).annotations({ description: "c-outer" }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), { as: "Option" })
              .annotations({ description: "d-outer" }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { as: "Option" })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "type": "string" },
              "b": { "type": "string", "description": "b-inner" },
              "c": { "type": "string", "description": "c-outer" },
              "d": { "type": "string", "description": "d-outer" },
              "e": { "type": "string" }
            },
            "required": [],
            "additionalProperties": false
          })
        })

        it(`{ as: "Option", nullable: true }`, async () => {
          const schema = Schema.Struct({
            a: Schema.optionalWith(Schema.String, { as: "Option", nullable: true }),
            b: Schema.optionalWith(Schema.String.annotations({ description: "b-inner" }), {
              as: "Option",
              nullable: true
            }),
            c: Schema.optionalWith(Schema.String, { as: "Option", nullable: true }).annotations({
              description: "c-outer"
            }),
            d: Schema.optionalWith(Schema.String.annotations({ description: "d-inner" }), {
              as: "Option",
              nullable: true
            }).annotations({
              description: "d-outer"
            }),
            e: Schema.optionalWith(Schema.UndefinedOr(Schema.String), { as: "Option", nullable: true })
          })
          await assertDraft7(schema, {
            "type": "object",
            "properties": {
              "a": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
              "b": {
                "anyOf": [{ "type": "string", "description": "b-inner" }, { "type": "null" }]
              },
              "c": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "c-outer" },
              "d": {
                "anyOf": [{ "type": "string", "description": "d-inner" }, { "type": "null" }],
                "description": "d-outer"
              },
              "e": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
            },
            "required": [],
            "additionalProperties": false
          })
        })
      })

      it("Struct + Record", async () => {
        const schema = Schema.Struct({
          a: Schema.String
        }, Schema.Record({ key: Schema.String, value: Schema.String }))

        await assertDraft7(schema, {
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "type": "string"
            }
          },
          "additionalProperties": {
            "type": "string"
          }
        })
      })

      describe("identifier annotation", () => {
        it("should use the identifier annotation of the property signature values", async () => {
          const schemaWithIdentifier = Schema.String.annotations({
            identifier: "my-id"
          })

          const schema = Schema.Struct({
            a: schemaWithIdentifier,
            b: schemaWithIdentifier
          })

          await assertDraft7(schema, {
            "$defs": {
              "my-id": {
                "type": "string"
              }
            },
            "type": "object",
            "required": [
              "a",
              "b"
            ],
            "properties": {
              "a": {
                "$ref": "#/$defs/my-id"
              },
              "b": {
                "$ref": "#/$defs/my-id"
              }
            },
            "additionalProperties": false
          })
        })

        it("should ignore the identifier annotation when annotating the value schema", async () => {
          const schemaWithIdentifier = Schema.String.annotations({
            identifier: "my-id"
          })

          const schema = Schema.Struct({
            a: schemaWithIdentifier.annotations({
              description: "a-description"
            }),
            b: schemaWithIdentifier.annotations({
              description: "b-description"
            })
          })

          await assertDraft7(schema, {
            "type": "object",
            "required": [
              "a",
              "b"
            ],
            "properties": {
              "a": {
                "type": "string",
                "description": "a-description"
              },
              "b": {
                "type": "string",
                "description": "b-description"
              }
            },
            "additionalProperties": false
          })
        })

        it("should use the identifier annotation when annotating the property signature", async () => {
          const schemaWithIdentifier = Schema.String.annotations({
            identifier: "my-id"
          })

          const schema = Schema.Struct({
            a: Schema.propertySignature(schemaWithIdentifier).annotations({
              description: "a-description"
            }),
            b: Schema.propertySignature(schemaWithIdentifier).annotations({
              description: "b-description"
            })
          })

          await assertDraft7(schema, {
            "$defs": {
              "my-id": {
                "type": "string"
              }
            },
            "type": "object",
            "required": [
              "a",
              "b"
            ],
            "properties": {
              "a": {
                "allOf": [
                  {
                    "$ref": "#/$defs/my-id"
                  }
                ],
                "description": "a-description"
              },
              "b": {
                "allOf": [
                  {
                    "$ref": "#/$defs/my-id"
                  }
                ],
                "description": "b-description"
              }
            },
            "additionalProperties": false
          })
        })
      })
    })

    describe("Record", () => {
      it("Record(refinement, number)", async () => {
        await assertDraft7(
          Schema.Record({ key: Schema.String.pipe(Schema.minLength(1)), value: Schema.Number }),
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
              "title": "minLength(1)",
              "description": "a string at least 1 character(s) long",
              "minLength": 1
            }
          }
        )
      })

      it("Record(string, number)", async () => {
        await assertDraft7(Schema.Record({ key: Schema.String, value: Schema.Number }), {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": {
            "type": "number"
          }
        })
      })

      it("Record('a' | 'b', number)", async () => {
        await assertDraft7(
          Schema.Record(
            { key: Schema.Union(Schema.Literal("a"), Schema.Literal("b")), value: Schema.Number }
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

      it("Record(${string}-${string}, number)", async () => {
        const schema = Schema.Record(
          { key: Schema.TemplateLiteral(Schema.String, Schema.Literal("-"), Schema.String), value: Schema.Number }
        )
        await assertDraft7(schema, {
          "type": "object",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": { "type": "number" }
          },
          "propertyNames": {
            "pattern": "^[\\s\\S]*?-[\\s\\S]*?$",
            "type": "string"
          }
        })
      })

      it("Record(pattern, number)", async () => {
        const schema = Schema.Record(
          { key: Schema.String.pipe(Schema.pattern(new RegExp("^.*-.*$"))), value: Schema.Number }
        )
        await assertDraft7(schema, {
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
        })
      })

      it("Record(SymbolFromSelf & annotation, number)", async () => {
        await assertDraft7(
          Schema.Record({
            key: Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "string" } }),
            value: Schema.Number
          }),
          {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": [],
            "properties": {},
            "additionalProperties": {
              "type": "number"
            },
            "propertyNames": {
              "type": "string"
            }
          }
        )
      })

      it("Record(string, UndefinedOr(number))", async () => {
        await assertDraft7(Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(Schema.Number) }), {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": { "type": "number" }
        })
      })

      it("partial(Struct + Record(string, number))", async () => {
        const schema = Schema.partial(
          Schema.Struct(
            { foo: Schema.Number },
            {
              key: Schema.String,
              value: Schema.Number
            }
          )
        )

        await assertDraft7(schema, {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [],
          "properties": {
            "foo": {
              "type": "number"
            }
          },
          "additionalProperties": {
            "type": "number"
          }
        })
      })
    })

    describe("Union", () => {
      it("never members", async () => {
        await assertDraft7(Schema.Union(Schema.String, Schema.Never), {
          "type": "string"
        })
        await assertDraft7(Schema.Union(Schema.String, Schema.Union(Schema.Never, Schema.Never)), {
          "type": "string"
        })
      })

      it("String | Number", async () => {
        await assertDraft7(Schema.Union(Schema.String, Schema.Number), {
          "anyOf": [
            { "type": "string" },
            { "type": "number" }
          ]
        })
      })

      describe("Union including literals", () => {
        it(`1 | 2`, async () => {
          await assertDraft7(
            Schema.Union(Schema.Literal(1), Schema.Literal(2)),
            {
              "type": "number",
              "enum": [1, 2]
            }
          )
        })

        it(`1(with description) | 2`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1).annotations({ description: "1-description" }),
              Schema.Literal(2)
            ),
            {
              "anyOf": [
                {
                  "type": "number",
                  "enum": [1],
                  "description": "1-description"
                },
                { "type": "number", "enum": [2] }
              ]
            }
          )
        })

        it(`1 | 2(with description)`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1),
              Schema.Literal(2).annotations({ description: "2-description" })
            ),
            {
              "anyOf": [
                { "type": "number", "enum": [1] },
                {
                  "type": "number",
                  "enum": [2],
                  "description": "2-description"
                }
              ]
            }
          )
        })

        it(`1 | 2 | string`, async () => {
          await assertDraft7(Schema.Union(Schema.Literal(1), Schema.Literal(2), Schema.String), {
            "anyOf": [
              { "type": "number", "enum": [1, 2] },
              { "type": "string" }
            ]
          })
        })

        it(`(1 | 2) | string`, async () => {
          await assertDraft7(Schema.Union(Schema.Literal(1, 2), Schema.String), {
            "anyOf": [
              { "type": "number", "enum": [1, 2] },
              { "type": "string" }
            ]
          })
        })

        it(`(1 | 2)(with description) | string`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1, 2).annotations({ description: "1-2-description" }),
              Schema.String
            ),
            {
              "anyOf": [
                {
                  "type": "number",
                  "enum": [1, 2],
                  "description": "1-2-description"
                },
                { "type": "string" }
              ]
            }
          )
        })

        it(`(1 | 2)(with description) | 3 | string`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1, 2).annotations({ description: "1-2-description" }),
              Schema.Literal(3),
              Schema.String
            ),
            {
              "anyOf": [
                {
                  "type": "number",
                  "enum": [1, 2],
                  "description": "1-2-description"
                },
                { "enum": [3], "type": "number" },
                {
                  "type": "string"
                }
              ]
            }
          )
        })

        it(`1(with description) | 2 | string`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1).annotations({ description: "1-description" }),
              Schema.Literal(2),
              Schema.String
            ),
            {
              "anyOf": [
                {
                  "type": "number",
                  "description": "1-description",
                  "enum": [1]
                },
                { "type": "number", "enum": [2] },
                { "type": "string" }
              ]
            }
          )
        })

        it(`1 | 2(with description) | string`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.Literal(1),
              Schema.Literal(2).annotations({ description: "2-description" }),
              Schema.String
            ),
            {
              "anyOf": [
                { "type": "number", "enum": [1] },
                {
                  "type": "number",
                  "description": "2-description",
                  "enum": [2]
                },
                { "type": "string" }
              ]
            }
          )
        })

        it(`string | 1 | 2 `, async () => {
          await assertDraft7(Schema.Union(Schema.String, Schema.Literal(1), Schema.Literal(2)), {
            "anyOf": [
              { "type": "string" },
              { "type": "number", "enum": [1, 2] }
            ]
          })
        })

        it(`string | (1 | 2) `, async () => {
          await assertDraft7(Schema.Union(Schema.String, Schema.Literal(1, 2)), {
            "anyOf": [
              { "type": "string" },
              { "type": "number", "enum": [1, 2] }
            ]
          })
        })

        it(`string | 1(with description) | 2`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.String,
              Schema.Literal(1).annotations({ description: "1-description" }),
              Schema.Literal(2)
            ),
            {
              "anyOf": [
                { "type": "string" },
                {
                  "type": "number",
                  "description": "1-description",
                  "enum": [1]
                },
                { "type": "number", "enum": [2] }
              ]
            }
          )
        })

        it(`string | 1 | 2(with description)`, async () => {
          await assertDraft7(
            Schema.Union(
              Schema.String,
              Schema.Literal(1),
              Schema.Literal(2).annotations({ description: "2-description" })
            ),
            {
              "anyOf": [
                { "type": "string" },
                { "type": "number", "enum": [1] },
                {
                  "type": "number",
                  "description": "2-description",
                  "enum": [2]
                }
              ]
            }
          )
        })
      })
    })

    describe("Suspend", () => {
      it("suspend(() => schema).annotations({ identifier: '...' })", async () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema: Schema.Schema<A> = Schema.suspend(() =>
          Schema.Struct({
            a: Schema.String,
            as: Schema.Array(schema)
          })
        ).annotations({ identifier: "ID" })
        await assertDraft7(schema, {
          "$ref": "#/$defs/ID",
          "$defs": {
            "ID": {
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
                    "$ref": "#/$defs/ID"
                  }
                }
              },
              "additionalProperties": false
            }
          }
        })
      })

      it("suspend(() => schema.annotations({ identifier: '...' }))", async () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema: Schema.Schema<A> = Schema.suspend(() =>
          Schema.Struct({
            a: Schema.String,
            as: Schema.Array(schema)
          }).annotations({ identifier: "ID" })
        )
        await assertDraft7(schema, {
          "$ref": "#/$defs/ID",
          "$defs": {
            "ID": {
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
                    "$ref": "#/$defs/ID"
                  }
                }
              },
              "additionalProperties": false
            }
          }
        })
      })

      it("inner annotation", async () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema = Schema.Struct({
          a: Schema.String,
          as: Schema.Array(
            Schema.suspend((): Schema.Schema<A> => schema).annotations({
              identifier: "ID"
            })
          )
        })
        await assertDraft7(schema, {
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
                "$ref": "#/$defs/ID"
              }
            }
          },
          "additionalProperties": false,
          "$defs": {
            "ID": {
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
                    "$ref": "#/$defs/ID"
                  }
                }
              },
              "additionalProperties": false
            }
          }
        })
      })

      it("outer annotation", async () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema = Schema.Struct({
          a: Schema.String,
          as: Schema.Array(Schema.suspend((): Schema.Schema<A> => schema))
        }).annotations({ identifier: "ID" })
        await assertDraft7(schema, {
          "$ref": "#/$defs/ID",
          "$defs": {
            "ID": {
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
                    "$ref": "#/$defs/ID"
                  }
                }
              },
              "additionalProperties": false
            }
          }
        })
      })

      it("should support mutually suspended schemas", async () => {
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
            value: Schema.Union(Schema.Number, Operation)
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

        await assertDraft7(Operation, {
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
                  "type": "string",
                  "enum": ["operation"]
                },
                "operator": {
                  "type": "string",
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
                  "type": "string",
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
        })
      })
    })

    describe("Class", () => {
      it("should use the identifier as JSON Schema identifier", async () => {
        class A extends Schema.Class<A>("A")(Schema.Struct({ a: Schema.String })) {}
        await assertDraft7(A, {
          "$defs": {
            "A": {
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
          "$ref": "#/$defs/A"
        })
      })

      it("type side json schema annotation", async () => {
        class A extends Schema.Class<A>("A")(Schema.Struct({ a: Schema.String }), {
          identifier: "A2"
        }) {}
        await assertDraft7(A, {
          "$defs": {
            "A2": {
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
          "$ref": "#/$defs/A2"
        })
      })

      it("transformation side json schema annotation", async () => {
        class A extends Schema.Class<A>("A")(Schema.Struct({ a: Schema.String }), [
          undefined,
          {
            identifier: "A2"
          }
        ]) {}
        await assertDraft7(A, {
          "$defs": {
            "A2": {
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
          "$ref": "#/$defs/A2"
        })
      })

      it("from side json schema annotation", async () => {
        class A extends Schema.Class<A>("A")(Schema.Struct({ a: Schema.String }), [
          undefined,
          undefined,
          {
            identifier: "A2"
          }
        ]) {}
        await assertDraft7(A, {
          "$defs": {
            "A": {
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
          "$ref": "#/$defs/A"
        })
      })

      it("should escape special characters in the $ref", async () => {
        class A extends Schema.Class<A>("~package/name")(Schema.Struct({ a: Schema.String })) {}
        await assertDraft7(A, {
          "$defs": {
            "~package/name": {
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
          "$ref": "#/$defs/~0package~1name"
        })
      })
    })

    it("compose", async () => {
      const schema = Schema.Struct({
        a: Schema.NonEmptyString.pipe(Schema.compose(Schema.NumberFromString))
      })
      await assertDraft7(schema, {
        "$defs": {
          "NonEmptyString": {
            "type": "string",
            "title": "nonEmptyString",
            "description": "a non empty string",
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
      })
    })

    it("should correctly generate JSON Schemas for a schema created by extending two refinements", async () => {
      await assertDraft7(
        Schema.Struct({
          a: Schema.String
        }).pipe(
          Schema.filter(() => true, {
            jsonSchema: { "examples": ["c5052c04-d6c9-44f3-9c8f-ede707d6ce38"] }
          })
        ).pipe(Schema.extend(
          Schema.Struct({
            b: Schema.Number
          }).pipe(
            Schema.filter(() => true, {
              jsonSchema: { "$comment": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15" }
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
          "examples": ["c5052c04-d6c9-44f3-9c8f-ede707d6ce38"],
          "$comment": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15",
          "additionalProperties": false
        }
      )
    })

    describe("identifier annotation support", () => {
      it("String", async () => {
        await assertDraft7(Schema.String.annotations({ identifier: "ID" }), {
          "$defs": {
            "ID": {
              "type": "string"
            }
          },
          "$ref": "#/$defs/ID"
        })
        await assertDraft7(Schema.String.annotations({ identifier: "ID", description: "description" }), {
          "$defs": {
            "ID": {
              "type": "string",
              "description": "description"
            }
          },
          "$ref": "#/$defs/ID"
        })
      })

      it("Refinement", async () => {
        await assertDraft7(
          Schema.String.pipe(Schema.minLength(2)).annotations({ identifier: "ID" }),
          {
            "$defs": {
              "ID": {
                "type": "string",
                "title": "minLength(2)",
                "description": "a string at least 2 character(s) long",
                "minLength": 2
              }
            },
            "$ref": "#/$defs/ID"
          }
        )
      })

      describe("Struct", () => {
        it("annotation", async () => {
          await assertDraft7(
            Schema.Struct({
              a: Schema.String
            }).annotations({ identifier: "ID" }),
            {
              "$defs": {
                "ID": {
                  "type": "object",
                  "required": ["a"],
                  "properties": {
                    "a": { "type": "string" }
                  },
                  "additionalProperties": false
                }
              },
              "$ref": "#/$defs/ID"
            }
          )
        })

        it("field annotations", async () => {
          const Name = Schema.String.annotations({
            identifier: "ID",
            description: "description"
          })
          const schema = Schema.Struct({
            a: Name
          })
          await assertDraft7(schema, {
            "$defs": {
              "ID": {
                "type": "string",
                "description": "description"
              }
            },
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "$ref": "#/$defs/ID"
              }
            },
            "additionalProperties": false
          })
        })

        it("self annotation + field annotations", async () => {
          const Name = Schema.String.annotations({
            identifier: "b49f125d-1646-4eb5-8120-9524ab6039de",
            description: "703b7ff0-cb8d-49de-aeeb-05d92faa4599",
            title: "4b6d9ea6-7c4d-4073-a427-8d1b82fd1677"
          })
          await assertDraft7(
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

        it("deeply nested field annotations", async () => {
          const Name = Schema.String.annotations({
            identifier: "434a08dd-3f8f-4de4-b91d-8846aab1fb05",
            description: "eb183f5c-404c-4686-b78b-1bd00d18f8fd",
            title: "c0cbd438-1fb5-47fe-bf81-1ff5527e779a"
          })
          const schema = Schema.Struct({ a: Name, b: Schema.Struct({ c: Name }) })
          await assertDraft7(schema, {
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
        it("Union of literals with identifiers", async () => {
          await assertDraft7(
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
                  "type": "string",
                  "enum": ["a"],
                  "description": "ef296f1c-01fe-4a20-bd35-ed449c964c49"
                },
                "2a4e4f67-3732-4f7b-a505-856e51dd1578": {
                  "type": "string",
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
    })

    it("should filter out invalid examples", async () => {
      await assertDraft7(Schema.NonEmptyString.annotations({ examples: ["", "a"] }), {
        "type": "string",
        "title": "nonEmptyString",
        "description": "a non empty string",
        "minLength": 1,
        "examples": ["a"]
      })
    })

    it("should filter out invalid defaults", async () => {
      await assertDraft7(Schema.NonEmptyString.annotations({ default: "" }), {
        "type": "string",
        "title": "nonEmptyString",
        "description": "a non empty string",
        "minLength": 1
      })
    })

    describe("should encode the examples", () => {
      it("property signatures", async () => {
        const schema = Schema.Struct({
          a: Schema.NumberFromString.pipe(Schema.propertySignature).annotations({ examples: [1, 2] })
        })
        await assertDraft7(schema, {
          "$defs": {
            "NumberFromString": {
              "description": "a string to be decoded into a number",
              "type": "string"
            }
          },
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "allOf": [
                {
                  "$ref": "#/$defs/NumberFromString"
                }
              ],
              "examples": ["1", "2"]
            }
          },
          "additionalProperties": false
        })
      })

      it("elements", async () => {
        const schema = Schema.Tuple(Schema.NumberFromString.pipe(Schema.element).annotations({ examples: [1, 2] }))
        await assertDraft7(schema, {
          "$defs": {
            "NumberFromString": {
              "description": "a string to be decoded into a number",
              "type": "string"
            }
          },
          "type": "array",
          "items": [
            {
              "allOf": [
                {
                  "$ref": "#/$defs/NumberFromString"
                }
              ],
              "examples": ["1", "2"]
            }
          ],
          "minItems": 1,
          "additionalItems": false
        })
      })
    })

    it("Exit", async () => {
      const schema = Schema.Exit({
        failure: Schema.String,
        success: Schema.Number,
        defect: Schema.Defect
      })
      await assertDraft7(schema, {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$defs": {
          "CauseEncoded0": {
            "anyOf": [
              {
                "type": "object",
                "required": [
                  "_tag"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Empty"
                    ]
                  }
                },
                "additionalProperties": false
              },
              {
                "type": "object",
                "required": [
                  "_tag",
                  "error"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Fail"
                    ]
                  },
                  "error": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              },
              {
                "type": "object",
                "required": [
                  "_tag",
                  "defect"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Die"
                    ]
                  },
                  "defect": {
                    "$ref": "#/$defs/Defect"
                  }
                },
                "additionalProperties": false
              },
              {
                "type": "object",
                "required": [
                  "_tag",
                  "fiberId"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Interrupt"
                    ]
                  },
                  "fiberId": {
                    "$ref": "#/$defs/FiberIdEncoded"
                  }
                },
                "additionalProperties": false
              },
              {
                "type": "object",
                "required": [
                  "_tag",
                  "left",
                  "right"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Sequential"
                    ]
                  },
                  "left": {
                    "$ref": "#/$defs/CauseEncoded0"
                  },
                  "right": {
                    "$ref": "#/$defs/CauseEncoded0"
                  }
                },
                "additionalProperties": false
              },
              {
                "type": "object",
                "required": [
                  "_tag",
                  "left",
                  "right"
                ],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Parallel"
                    ]
                  },
                  "left": {
                    "$ref": "#/$defs/CauseEncoded0"
                  },
                  "right": {
                    "$ref": "#/$defs/CauseEncoded0"
                  }
                },
                "additionalProperties": false
              }
            ],
            "title": "CauseEncoded<string>"
          },
          "Defect": {
            "$id": "/schemas/unknown",
            "title": "unknown"
          },
          "FiberIdEncoded": {
            "anyOf": [
              {
                "$ref": "#/$defs/FiberIdNoneEncoded"
              },
              {
                "$ref": "#/$defs/FiberIdRuntimeEncoded"
              },
              {
                "$ref": "#/$defs/FiberIdCompositeEncoded"
              }
            ]
          },
          "FiberIdNoneEncoded": {
            "type": "object",
            "required": [
              "_tag"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "None"
                ]
              }
            },
            "additionalProperties": false
          },
          "FiberIdRuntimeEncoded": {
            "type": "object",
            "required": [
              "_tag",
              "id",
              "startTimeMillis"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "Runtime"
                ]
              },
              "id": {
                "$ref": "#/$defs/Int"
              },
              "startTimeMillis": {
                "$ref": "#/$defs/Int"
              }
            },
            "additionalProperties": false
          },
          "Int": {
            "type": "integer",
            "description": "an integer",
            "title": "int"
          },
          "FiberIdCompositeEncoded": {
            "type": "object",
            "required": [
              "_tag",
              "left",
              "right"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "Composite"
                ]
              },
              "left": {
                "$ref": "#/$defs/FiberIdEncoded"
              },
              "right": {
                "$ref": "#/$defs/FiberIdEncoded"
              }
            },
            "additionalProperties": false
          }
        },
        "anyOf": [
          {
            "type": "object",
            "required": [
              "_tag",
              "cause"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "Failure"
                ]
              },
              "cause": {
                "$ref": "#/$defs/CauseEncoded0"
              }
            },
            "additionalProperties": false
          },
          {
            "type": "object",
            "required": [
              "_tag",
              "value"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "Success"
                ]
              },
              "value": {
                "type": "number"
              }
            },
            "additionalProperties": false
          }
        ],
        "title": "ExitEncoded<number, string, Defect>"
      })
    })

    describe("Schema.encodedBoundSchema / Schema.encodedSchema", () => {
      describe("Suspend", () => {
        it("without inner transformations", async () => {
          interface Category {
            readonly name: string
            readonly categories: ReadonlyArray<Category>
          }

          const schema: Schema.Schema<Category> = Schema.Struct({
            name: Schema.String,
            categories: Schema.Array(
              Schema.suspend(() => schema).annotations({ identifier: "ID" })
            )
          })

          await assertDraft7(Schema.encodedBoundSchema(schema), {
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
                  "$ref": "#/$defs/IDEncodedBound"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncodedBound": {
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
                      "$ref": "#/$defs/IDEncodedBound"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
          await assertDraft7(Schema.encodedSchema(schema), {
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
                  "$ref": "#/$defs/IDEncoded"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncoded": {
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
                      "$ref": "#/$defs/IDEncoded"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
        })

        it("with inner transformations", async () => {
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
              Schema.suspend(() => schema).annotations({ identifier: "ID" })
            )
          })

          await assertDraft7(Schema.encodedBoundSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string",
                "description": "a string to be decoded into a number"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncodedBound"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncodedBound": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "a string to be decoded into a number"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncodedBound"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
          await assertDraft7(Schema.encodedSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string",
                "description": "a string to be decoded into a number"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncoded"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncoded": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "a string to be decoded into a number"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncoded"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
        })
      })
    })

    describe("jsonSchema annotation support", () => {
      describe("Class", () => {
        it("custom annotation", async () => {
          class A extends Schema.Class<A>("A")({ a: Schema.String }, {
            jsonSchema: { "type": "string" }
          }) {}
          await assertDraft7(A, {
            "$defs": {
              "A": {
                "type": "string"
              }
            },
            "$ref": "#/$defs/A"
          })
        })

        it("should support typeSchema(Class) with custom annotation", async () => {
          class A extends Schema.Class<A>("A")({ a: Schema.String }, {
            jsonSchema: { "type": "string" }
          }) {}
          await assertDraft7(Schema.typeSchema(A), {
            "$defs": {
              "A": {
                "type": "string"
              }
            },
            "$ref": "#/$defs/A"
          })
        })
      })

      it("Declaration", async () => {
        class MyType {}
        const schema = Schema.declare<MyType>((x) => x instanceof MyType, {
          jsonSchema: {
            type: "string",
            description: "default-description"
          }
        })
        await assertDraft7(schema, {
          "type": "string",
          "description": "default-description"
        })
        await assertDraft7(
          schema.annotations({
            description: "description"
          }),
          {
            "type": "string",
            "description": "description"
          }
        )
      })

      it("Void", async () => {
        await assertDraft7(Schema.Void.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Never", async () => {
        await assertDraft7(Schema.Never.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Literal", async () => {
        await assertDraft7(Schema.Literal("a").annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("SymbolFromSelf", async () => {
        await assertDraft7(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("UniqueSymbolFromSelf", async () => {
        await assertDraft7(
          Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
            jsonSchema: { "type": "string" }
          }),
          { "type": "string" }
        )
      })

      it("TemplateLiteral", async () => {
        await assertDraft7(
          Schema.TemplateLiteral(Schema.Literal("a"), Schema.String, Schema.Literal("b")).annotations({
            jsonSchema: { "type": "string" }
          }),
          { "type": "string" }
        )
      })

      it("Undefined", async () => {
        await assertDraft7(Schema.Undefined.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Unknown", async () => {
        await assertDraft7(Schema.Unknown.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Any", async () => {
        await assertDraft7(Schema.Any.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Object", async () => {
        await assertDraft7(Schema.Object.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("String", async () => {
        await assertDraft7(
          Schema.String.annotations({
            jsonSchema: {
              "type": "string",
              "description": "description",
              "format": "uuid"
            }
          }),
          {
            "type": "string",
            "description": "description",
            "format": "uuid"
          }
        )
        await assertDraft7(
          Schema.String.annotations({
            identifier: "630d10c4-7030-45e7-894d-2c0bf5acadcf",
            jsonSchema: { "type": "string", "description": "description" }
          }),
          {
            "$defs": {
              "630d10c4-7030-45e7-894d-2c0bf5acadcf": {
                "type": "string",
                "description": "description"
              }
            },
            "$ref": "#/$defs/630d10c4-7030-45e7-894d-2c0bf5acadcf"
          }
        )
      })

      it("Number", async () => {
        await assertDraft7(Schema.Number.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("BigintFromSelf", async () => {
        await assertDraft7(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Boolean", async () => {
        await assertDraft7(Schema.Boolean.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Enums", async () => {
        enum Fruits {
          Apple,
          Banana
        }
        await assertDraft7(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("Tuple", async () => {
        await assertDraft7(
          Schema.Tuple(Schema.String, Schema.Number).annotations({ jsonSchema: { "type": "string" } }),
          { "type": "string" }
        )
      })

      it("Struct", async () => {
        await assertDraft7(
          Schema.Struct({ a: Schema.String, b: Schema.Number }).annotations({
            jsonSchema: { "type": "string" }
          }),
          { "type": "string" }
        )
      })

      it("Union", async () => {
        await assertDraft7(
          Schema.Union(Schema.String, Schema.Number).annotations({ jsonSchema: { "type": "string" } }),
          { "type": "string" }
        )
      })

      it("UUID", async () => {
        await assertDraft7(
          Schema.UUID,
          {
            "$defs": {
              "UUID": {
                "description": "a Universally Unique Identifier",
                "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
                "type": "string",
                "format": "uuid"
              }
            },
            "$ref": "#/$defs/UUID"
          }
        )
      })

      it("Suspend", async () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema = Schema.Struct({
          a: Schema.String,
          as: Schema.Array(
            Schema.suspend((): Schema.Schema<A> => schema).annotations({ jsonSchema: { "type": "string" } })
          )
        })

        await assertDraft7(schema, {
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
                "type": "string"
              }
            }
          },
          "additionalProperties": false
        })
      })

      describe("Refinement", () => {
        it("Int", async () => {
          await assertDraft7(Schema.Int.annotations({ jsonSchema: { "type": "string" } }), {
            "type": "string"
          })
        })

        it("custom", async () => {
          await assertDraft7(
            Schema.String.pipe(Schema.filter(() => true, { jsonSchema: {} })).annotations({
              identifier: "ID"
            }),
            {
              "$ref": "#/$defs/ID",
              "$defs": {
                "ID": {
                  "type": "string"
                }
              }
            }
          )
        })
      })

      it("Transformation", async () => {
        await assertDraft7(Schema.NumberFromString.annotations({ jsonSchema: { "type": "string" } }), {
          "type": "string"
        })
      })

      it("refinement of a transformation with an override annotation", async () => {
        await assertDraft7(Schema.Date.annotations({ jsonSchema: { type: "string", format: "date-time" } }), {
          "format": "date-time",
          "type": "string"
        })
        await assertDraft7(
          Schema.Date.annotations({
            jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
          }),
          {
            "anyOf": [{ "type": "object" }, { "type": "array" }]
          }
        )
        await assertDraft7(Schema.Date.annotations({ jsonSchema: { "$ref": "x" } }), {
          "$ref": "x"
        })
        await assertDraft7(Schema.Date.annotations({ jsonSchema: { "type": "number", "const": 1 } }), {
          "type": "number",
          "const": 1
        })
        await assertDraft7(Schema.Date.annotations({ jsonSchema: { "type": "number", "enum": [1] } }), {
          "type": "number",
          "enum": [1]
        })
      })

      it("refinement of a transformation without an override annotation", async () => {
        await assertDraft7(Schema.Trim.pipe(Schema.nonEmptyString()), {
          "type": "string",
          "description": "a string that will be trimmed"
        })
        await assertDraft7(
          Schema.Trim.pipe(Schema.nonEmptyString({ jsonSchema: { title: "a0ba6c10-091e-4ceb-9773-25fb1466fb1b" } })),
          {
            "type": "string",
            "description": "a string that will be trimmed"
          }
        )
        await assertDraft7(
          Schema.Trim.pipe(Schema.nonEmptyString()).annotations({
            jsonSchema: { title: "75f7eb4f-626d-4dc6-af48-c17094418d85" }
          }),
          {
            "type": "string",
            "description": "a string that will be trimmed"
          }
        )
      })

      it("should detect a fragment on a non-refinement schema", async () => {
        const schema = Schema.UUID.pipe(
          Schema.compose(Schema.String),
          Schema.annotations({
            identifier: "UUID",
            title: "title",
            description: "description",
            jsonSchema: {
              format: "uuid" // fragment
            }
          })
        )
        await assertDraft7(
          schema,
          {
            "$defs": {
              "UUID": {
                "type": "string",
                "description": "description",
                "title": "title",
                "format": "uuid",
                "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
              }
            },
            "$ref": "#/$defs/UUID"
          }
        )
      })
    })

    describe("Pruning `undefined` and make the property optional by default", () => {
      it("Undefined", async () => {
        await assertDraft7(
          Schema.Struct({
            a: Schema.Undefined
          }),
          {
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "$id": "/schemas/never",
                "not": {},
                "title": "never"
              }
            },
            "additionalProperties": false
          }
        )
      })

      it("UndefinedOr(Undefined)", async () => {
        await assertDraft7(
          Schema.Struct({
            a: Schema.UndefinedOr(Schema.Undefined)
          }),
          {
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "$id": "/schemas/never",
                "not": {},
                "title": "never"
              }
            },
            "additionalProperties": false
          }
        )
      })

      it("Nested `Undefined`s", async () => {
        await assertDraft7(
          Schema.Struct({
            a: Schema.UndefinedOr(Schema.UndefinedOr(Schema.Undefined))
          }),
          {
            "type": "object",
            "required": [],
            "properties": {
              "a": {
                "$id": "/schemas/never",
                "not": {},
                "title": "never"
              }
            },
            "additionalProperties": false
          }
        )
      })

      it("Schema.optional", async () => {
        await assertDraft7(
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

      it("Schema.optional + inner annotation", async () => {
        await assertDraft7(
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

      it("Schema.optional + outer annotation should override inner annotation", async () => {
        await assertDraft7(
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

      it("UndefinedOr", async () => {
        await assertDraft7(
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

      it("UndefinedOr + inner annotation", async () => {
        await assertDraft7(
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

      it("UndefinedOr + annotation should not override inner annotations", async () => {
        await assertDraft7(
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
                "description": "inner"
              }
            },
            "additionalProperties": false
          }
        )
      })

      it("UndefinedOr + propertySignature annotation should override inner and middle annotations", async () => {
        await assertDraft7(
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

      it("UndefinedOr + jsonSchema annotation should keep the property required", async () => {
        await assertDraft7(
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

      it("Transformation: OptionFromUndefinedOr", async () => {
        await assertDraft7(
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

      it("Suspend", async () => {
        await assertDraft7(
          Schema.Struct({
            a: Schema.suspend(() => Schema.UndefinedOr(Schema.String))
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

    describe("fromKey", () => {
      it("with transformation identifier annotation", async () => {
        await assertDraft7(
          Schema.Struct({
            a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
          }).annotations({
            identifier: "ID",
            description: "struct-description"
          }),
          {
            "$ref": "#/$defs/ID",
            "$defs": {
              "NonEmptyString": {
                "type": "string",
                "title": "nonEmptyString",
                "description": "a non empty string",
                "minLength": 1
              },
              "ID": {
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
                "description": "struct-description"
              }
            }
          }
        )
      })
    })
  })

  describe("jsonSchema2019-09", () => {
    describe("nullable handling", () => {
      it("Null", async () => {
        const schema = Schema.Null
        await assertDraft201909(schema, { "type": "null" })
      })

      it("NullOr(String)", async () => {
        const schema = Schema.NullOr(Schema.String)
        await assertDraft201909(schema, {
          "anyOf": [
            { "type": "string" },
            { "type": "null" }
          ]
        })
      })

      it("NullOr(Any)", async () => {
        const schema = Schema.NullOr(Schema.Any)
        await assertDraft201909(schema, {
          "$id": "/schemas/any",
          "title": "any"
        })
      })

      it("NullOr(Unknown)", async () => {
        const schema = Schema.NullOr(Schema.Unknown)
        await assertDraft201909(schema, {
          "$id": "/schemas/unknown",
          "title": "unknown"
        })
      })

      it("NullOr(Void)", async () => {
        const schema = Schema.NullOr(Schema.Void)
        await assertDraft201909(schema, {
          "$id": "/schemas/void",
          "title": "void"
        })
      })

      it("Literal | null", async () => {
        const schema = Schema.Literal("a", null)
        await assertDraft201909(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            { "type": "null" }
          ]
        })
      })

      it("Literal | null(with description)", async () => {
        const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
        await assertDraft201909(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            {
              "type": "null",
              "description": "mydescription"
            }
          ]
        })
      })

      it("Nested nullable unions", async () => {
        const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
        await assertDraft201909(schema, {
          "anyOf": [
            {
              "anyOf": [
                { "type": "string" },
                { "type": "null" }
              ]
            },
            {
              "anyOf": [
                { "type": "string", "enum": ["a"] },
                { "type": "null" }
              ]
            }
          ]
        })
      })
    })

    it("parseJson handling", async () => {
      const schema = Schema.parseJson(Schema.Struct({
        a: Schema.parseJson(Schema.NumberFromString)
      }))
      await assertDraft201909(
        schema,
        {
          "type": "string",
          "contentMediaType": "application/json",
          "contentSchema": {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string",
                "contentMediaType": "application/json",
                "contentSchema": {
                  "$ref": "#/$defs/NumberFromString"
                }
              }
            },
            "additionalProperties": false
          }
        }
      )
    })
  })

  describe("openApi3.1", () => {
    describe("nullable handling", () => {
      it("Null", async () => {
        const schema = Schema.Null
        await assertOpenApi3_1(schema, { "type": "null" })
      })

      it("NullOr(String)", async () => {
        const schema = Schema.NullOr(Schema.String)
        await assertOpenApi3_1(schema, {
          "anyOf": [
            { "type": "string" },
            { "type": "null" }
          ]
        })
      })

      it("NullOr(Any)", async () => {
        const schema = Schema.NullOr(Schema.Any)
        await assertOpenApi3_1(schema, {
          "$id": "/schemas/any",
          "title": "any"
        })
      })

      it("NullOr(Unknown)", async () => {
        const schema = Schema.NullOr(Schema.Unknown)
        await assertOpenApi3_1(schema, {
          "$id": "/schemas/unknown",
          "title": "unknown"
        })
      })

      it("NullOr(Void)", async () => {
        const schema = Schema.NullOr(Schema.Void)
        await assertOpenApi3_1(schema, {
          "$id": "/schemas/void",
          "title": "void"
        })
      })

      it("Literal | null", async () => {
        const schema = Schema.Literal("a", null)
        await assertOpenApi3_1(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            { "type": "null" }
          ]
        })
      })

      it("Literal | null(with description)", async () => {
        const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
        await assertOpenApi3_1(schema, {
          "anyOf": [
            {
              "type": "string",
              "enum": ["a"]
            },
            {
              "type": "null",
              "description": "mydescription"
            }
          ]
        })
      })

      it("Nested nullable unions", async () => {
        const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
        await assertOpenApi3_1(schema, {
          "anyOf": [
            {
              "anyOf": [
                { "type": "string" },
                { "type": "null" }
              ]
            },
            {
              "anyOf": [
                { "type": "string", "enum": ["a"] },
                { "type": "null" }
              ]
            }
          ]
        })
      })
    })

    it("parseJson handling", async () => {
      const schema = Schema.parseJson(Schema.Struct({
        a: Schema.parseJson(Schema.NumberFromString)
      }))
      await assertOpenApi3_1(
        schema,
        {
          "type": "string",
          "contentMediaType": "application/json",
          "contentSchema": {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string",
                "contentMediaType": "application/json",
                "contentSchema": {
                  "$ref": "#/$defs/NumberFromString"
                }
              }
            },
            "additionalProperties": false
          }
        }
      )
    })
  })
})

describe("jsonSchema2020-12", () => {
  describe("Tuple", () => {
    it("empty tuple", async () => {
      const schema = Schema.Tuple()
      await assertDraft2020_12(schema, {
        "type": "array",
        "maxItems": 0
      })
    })

    it("element", async () => {
      const schema = Schema.Tuple(Schema.Number)
      await assertDraft2020_12(schema, {
        "type": "array",
        "prefixItems": [{
          "type": "number"
        }],
        "minItems": 1,
        "items": false
      })
    })

    it("element + inner annotations", async () => {
      await assertDraft2020_12(
        Schema.Tuple(Schema.Number.annotations({ description: "inner" })),
        {
          "type": "array",
          "prefixItems": [{
            "type": "number",
            "description": "inner"
          }],
          "minItems": 1,
          "items": false
        }
      )
    })

    it("element + outer annotations should override inner annotations", async () => {
      await assertDraft2020_12(
        Schema.Tuple(
          Schema.element(Schema.Number.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "prefixItems": [{
            "type": "number",
            "description": "outer"
          }],
          "minItems": 1,
          "items": false
        }
      )
    })

    it("optionalElement", async () => {
      const schema = Schema.Tuple(Schema.optionalElement(Schema.Number))
      await assertDraft2020_12(schema, {
        "type": "array",
        "minItems": 0,
        "prefixItems": [
          {
            "type": "number"
          }
        ],
        "items": false
      })
    })

    it("optionalElement + inner annotations", async () => {
      await assertDraft2020_12(
        Schema.Tuple(Schema.optionalElement(Schema.Number).annotations({ description: "inner" })),
        {
          "type": "array",
          "minItems": 0,
          "prefixItems": [
            {
              "type": "number",
              "description": "inner"
            }
          ],
          "items": false
        }
      )
    })

    it("optionalElement + outer annotations should override inner annotations", async () => {
      await assertDraft2020_12(
        Schema.Tuple(
          Schema.optionalElement(Schema.Number).annotations({ description: "inner" }).annotations({
            description: "outer"
          })
        ),
        {
          "type": "array",
          "minItems": 0,
          "prefixItems": [
            {
              "type": "number",
              "description": "outer"
            }
          ],
          "items": false
        }
      )
    })

    it("element + optionalElement", async () => {
      const schema = Schema.Tuple(
        Schema.element(Schema.String.annotations({ description: "inner" })).annotations({ description: "outer" }),
        Schema.optionalElement(Schema.Number.annotations({ description: "inner?" })).annotations({
          description: "outer?"
        })
      )
      await assertDraft2020_12(schema, {
        "type": "array",
        "minItems": 1,
        "prefixItems": [
          {
            "type": "string",
            "description": "outer"
          },
          {
            "type": "number",
            "description": "outer?"
          }
        ],
        "items": false
      })
    })

    it("rest", async () => {
      const schema = Schema.Array(Schema.Number)
      await assertDraft2020_12(schema, {
        "type": "array",
        "items": {
          "type": "number"
        }
      })
    })

    it("rest + inner annotations", async () => {
      await assertDraft2020_12(Schema.Array(Schema.Number.annotations({ description: "inner" })), {
        "type": "array",
        "items": {
          "type": "number",
          "description": "inner"
        }
      })
    })

    it("optionalElement + rest + inner annotations", async () => {
      const schema = Schema.Tuple(
        [Schema.optionalElement(Schema.String)],
        Schema.element(Schema.Number.annotations({ description: "inner" }))
      )
      await assertDraft2020_12(schema, {
        "type": "array",
        "minItems": 0,
        "prefixItems": [
          {
            "type": "string"
          }
        ],
        "items": {
          "type": "number",
          "description": "inner"
        }
      })
    })

    it("optionalElement + rest + outer annotations should override inner annotations", async () => {
      await assertDraft2020_12(
        Schema.Tuple(
          [Schema.optionalElement(Schema.String)],
          Schema.element(Schema.Number.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "minItems": 0,
          "prefixItems": [
            {
              "type": "string"
            }
          ],
          "items": {
            "type": "number",
            "description": "outer"
          }
        }
      )
    })

    it("element + rest", async () => {
      const schema = Schema.Tuple([Schema.String], Schema.Number)
      await assertDraft2020_12(schema, {
        "type": "array",
        "prefixItems": [{
          "type": "string"
        }],
        "minItems": 1,
        "items": {
          "type": "number"
        }
      })
    })

    it("NonEmptyArray", async () => {
      await assertDraft2020_12(
        Schema.NonEmptyArray(Schema.String),
        {
          type: "array",
          minItems: 1,
          items: { type: "string" }
        }
      )
    })
  })
})
