import * as OpenApiJsonSchema from "@effect/platform/OpenApiJsonSchema"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Schema from "effect/Schema"

describe("OpenApiJsonSchema", () => {
  it("default options", () => {
    const schema = Schema.Struct({
      a: Schema.NumberFromString,
      b: Schema.parseJson(Schema.Struct({
        c: Schema.parseJson(Schema.Int)
      }))
    })
    const defs: Record<string, OpenApiJsonSchema.JsonSchema> = {}
    const jsonSchema = OpenApiJsonSchema.makeWithDefs(schema, { defs })
    deepStrictEqual(jsonSchema, {
      "additionalProperties": false,
      "properties": {
        "a": {
          "$ref": "#/components/schemas/NumberFromString"
        },
        "b": {
          "type": "string",
          "contentMediaType": "application/json",
          "contentSchema": {
            "type": "object",
            "required": ["c"],
            "properties": {
              "c": {
                "type": "string",
                "contentMediaType": "application/json",
                "contentSchema": {
                  "$ref": "#/components/schemas/Int"
                }
              }
            },
            "additionalProperties": false
          }
        }
      },
      "required": ["a", "b"],
      "type": "object"
    })
    deepStrictEqual(defs, {
      "Int": {
        "description": "an integer",
        "title": "int",
        "type": "integer"
      },
      "NumberFromString": {
        "description": "a string to be decoded into a number",
        "type": "string"
      }
    })
  })

  it(`additionalPropertiesStrategy: "allow"`, () => {
    const schema = Schema.Struct({ a: Schema.String })
    const defs: Record<string, OpenApiJsonSchema.JsonSchema> = {}
    const jsonSchema = OpenApiJsonSchema.makeWithDefs(schema, {
      defs,
      additionalPropertiesStrategy: "allow"
    })
    deepStrictEqual(jsonSchema, {
      "type": "object",
      "properties": {
        "a": {
          "type": "string"
        }
      },
      "required": ["a"],
      "additionalProperties": true
    })
    deepStrictEqual(defs, {})
  })
})
