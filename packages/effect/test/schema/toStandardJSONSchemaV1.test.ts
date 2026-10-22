import { assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { Schema } from "effect"
import type { StandardJSONSchemaV1 } from "effect/StandardSchema"
import { describe, it } from "vitest"

function standardConvertToJSONSchemaInput(
  schema: StandardJSONSchemaV1,
  target?: StandardJSONSchemaV1.Target
): Record<string, unknown> {
  return schema["~standard"].jsonSchema.input({
    target: target ?? "draft-2020-12"
  })
}

function standardConvertToJSONSchemaOutput(
  schema: StandardJSONSchemaV1,
  target?: StandardJSONSchemaV1.Target
): Record<string, unknown> {
  return schema["~standard"].jsonSchema.output({
    target: target ?? "draft-2020-12"
  })
}

describe("toStandardJSONSchemaV1", () => {
  it("describes subclass fields when the parent already has a Standard JSON Schema adapter", () => {
    class Parent extends Schema.Class<Parent>("Parent")({ a: Schema.String }) {}
    const parent = Schema.toStandardSchemaV1(Schema.toStandardJSONSchemaV1(Parent))
    class Child extends parent.extend<Child>("Child")({ b: Schema.FiniteFromString }) {}
    const child = Schema.toStandardJSONSchemaV1(Child)

    strictEqual("validate" in child["~standard"], false)
    deepStrictEqual(standardConvertToJSONSchemaInput(child), {
      $ref: "#/$defs/Child",
      $defs: {
        Child: {
          type: "object",
          properties: { a: { type: "string" }, b: { type: "string" } },
          required: ["a", "b"],
          additionalProperties: true
        }
      }
    })
    deepStrictEqual(standardConvertToJSONSchemaOutput(child), {
      $ref: "#/$defs/Child",
      $defs: {
        Child: {
          type: "object",
          properties: { a: { type: "string" }, b: { type: "number" } },
          required: ["a", "b"],
          additionalProperties: true
        }
      }
    })
  })

  it("should return a schema with Standard JSON Schema metadata", () => {
    const schema = Schema.FiniteFromString
    const standardSchema = Schema.toStandardJSONSchemaV1(schema)
    assertTrue(Schema.isSchema(standardSchema))
  })

  it("should support both standards", () => {
    const schema = Schema.String
    const both = Schema.toStandardSchemaV1(Schema.toStandardJSONSchemaV1(schema))
    deepStrictEqual(standardConvertToJSONSchemaInput(both), {
      "type": "string"
    })
  })

  describe("draft-2020-12", () => {
    it("should return the input JSON Schema", () => {
      const schema = Schema.Tuple([Schema.FiniteFromString])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema), {
        "type": "array",
        "prefixItems": [{ "type": "string" }],
        "minItems": 1,
        "maxItems": 1
      })
    })

    it("should return the output JSON Schema", () => {
      const schema = Schema.Tuple([Schema.FiniteFromString])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaOutput(standardJSONSchema), {
        "type": "array",
        "prefixItems": [{ "type": "number" }],
        "minItems": 1,
        "maxItems": 1
      })
    })

    it("a schema with identifier", () => {
      const S = Schema.String.annotate({ identifier: "id" })
      const schema = Schema.Tuple([S, S])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema), {
        "type": "array",
        "prefixItems": [
          { "$ref": "#/$defs/id" },
          { "$ref": "#/$defs/id" }
        ],
        "minItems": 2,
        "maxItems": 2,
        "$defs": {
          "id": {
            "type": "string"
          }
        }
      })
    })
  })

  describe("draft-07", () => {
    it("should return the input JSON Schema", () => {
      const schema = Schema.Tuple([Schema.FiniteFromString])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "draft-07"), {
        "type": "array",
        "items": [{ "type": "string" }],
        "minItems": 1,
        "maxItems": 1
      })
    })

    it("should return the output JSON Schema", () => {
      const schema = Schema.Tuple([Schema.FiniteFromString])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaOutput(standardJSONSchema, "draft-07"), {
        "type": "array",
        "items": [{ "type": "number" }],
        "minItems": 1,
        "maxItems": 1
      })
    })

    it("a schema with identifier", () => {
      const S = Schema.String.annotate({ identifier: "id" })
      const schema = Schema.Tuple([S, S])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "draft-07"), {
        "type": "array",
        "items": [
          { "$ref": "#/definitions/id" },
          { "$ref": "#/definitions/id" }
        ],
        "minItems": 2,
        "maxItems": 2,
        "definitions": {
          "id": {
            "type": "string"
          }
        }
      })
    })
  })

  describe("openapi-3.0", () => {
    it("should return the input JSON Schema", () => {
      const schema = Schema.Struct({ a: Schema.NullOr(Schema.FiniteFromString) })
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "object",
        "properties": {
          "a": { "type": "string", "nullable": true }
        },
        "required": ["a"],
        "additionalProperties": {}
      })
    })

    it("should return the output JSON Schema", () => {
      const schema = Schema.Struct({ a: Schema.NullOr(Schema.FiniteFromString) })
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaOutput(standardJSONSchema, "openapi-3.0"), {
        "type": "object",
        "properties": {
          "a": { "type": "number", "nullable": true }
        },
        "required": ["a"],
        "additionalProperties": {}
      })
    })

    it("a nullable schema", () => {
      const schema = Schema.NullOr(Schema.String).annotate({ description: "name", examples: ["a", null] })
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "string",
        "nullable": true,
        "description": "name",
        "example": "a"
      })
    })

    it("a nullable literal", () => {
      const schema = Schema.NullOr(Schema.Literal("cat"))
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "string",
        "enum": ["cat", null],
        "nullable": true
      })
    })

    it("a nullable union", () => {
      const schema = Schema.Union([Schema.Boolean, Schema.Int, Schema.Null])
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "anyOf": [
          { "type": "boolean", "nullable": true },
          { "type": "integer", "minimum": -9007199254740991, "maximum": 9007199254740991 }
        ]
      })
    })

    it("a nullable reference", () => {
      const schema = Schema.NullOr(Schema.String.annotate({ identifier: "id" }))
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "anyOf": [
          { "$ref": "#/definitions/id" },
          { "enum": [null] }
        ],
        "definitions": {
          "id": {
            "type": "string"
          }
        }
      })
    })

    it("null", () => {
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(Schema.Null)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "enum": [null]
      })
    })

    it("a literal", () => {
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(Schema.Literal("cat"))
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "string",
        "enum": ["cat"]
      })
    })

    it("exclusive bounds", () => {
      const schema = Schema.Finite.check(Schema.isGreaterThan(0), Schema.isLessThan(10))
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "number",
        "minimum": 0,
        "exclusiveMinimum": true,
        "maximum": 10,
        "exclusiveMaximum": true
      })
    })

    it("a schema with identifier", () => {
      const S = Schema.String.annotate({ identifier: "id" })
      const schema = Schema.Struct({ a: S, b: S })
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(schema)
      deepStrictEqual(standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"), {
        "type": "object",
        "properties": {
          "a": { "$ref": "#/definitions/id" },
          "b": { "$ref": "#/definitions/id" }
        },
        "required": ["a", "b"],
        "additionalProperties": {},
        "definitions": {
          "id": {
            "type": "string"
          }
        }
      })
    })

    it("should throw for a tuple", () => {
      const standardJSONSchema = Schema.toStandardJSONSchemaV1(Schema.Tuple([Schema.String]))
      throws(
        () => standardConvertToJSONSchemaInput(standardJSONSchema, "openapi-3.0"),
        new Error(
          `Cannot convert JSON Schema keyword "prefixItems" to OpenAPI 3.0: items must be a single schema`
        )
      )
    })
  })

  it("should throw for an unsupported target", () => {
    const standardJSONSchema = Schema.toStandardJSONSchemaV1(Schema.String)
    throws(
      () => standardConvertToJSONSchemaInput(standardJSONSchema, "draft-04"),
      new Error("Unsupported target: draft-04")
    )
    throws(
      () => standardConvertToJSONSchemaOutput(standardJSONSchema, "draft-04"),
      new Error("Unsupported target: draft-04")
    )
  })
})
