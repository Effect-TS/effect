import * as OpenApiJsonSchema from "@effect/platform/OpenApiJsonSchema"
import { describe, it } from "@effect/vitest"
import * as Schema from "effect/Schema"
import { deepStrictEqual } from "effect/test/util"

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
})
