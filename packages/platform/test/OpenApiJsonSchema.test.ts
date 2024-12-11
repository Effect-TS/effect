import * as OpenApiJsonSchema from "@effect/platform/OpenApiJsonSchema"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

type NullableCase = [string, Schema.Schema.Any, object]

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
    expect(jsonSchema).toStrictEqual({
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
    expect(defs).toStrictEqual({
      "Int": {
        "description": "an integer",
        "title": "Int",
        "type": "integer"
      },
      "NumberFromString": {
        "description": "a string that will be parsed into a number",
        "type": "string"
      }
    })
  })
  it.for<NullableCase>([
    ["union of 2 types", Schema.NullOr(Schema.Union(Schema.String, Schema.Number)), {
      anyOf: [{
        type: "string"
      }, {
        type: "number"
      }],
      nullable: true
    }],
    ["only one simple type", Schema.NullOr(Schema.String), {
      type: "string",
      nullable: true
    }],
    ["only null", Schema.Null, { enum: [null] }]
  ])("nullable case: %s", ([_name, schema, expected]) => {
    const defs: Record<string, OpenApiJsonSchema.JsonSchema> = {}
    const jsonSchema = OpenApiJsonSchema.makeWithDefs(schema, { defs })
    expect(jsonSchema).toStrictEqual(expected)
  })
})
