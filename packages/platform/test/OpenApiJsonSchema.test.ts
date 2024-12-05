import * as OpenApiJsonSchema from "@effect/platform/OpenApiJsonSchema"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

const expectJSONSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object
) => {
  const jsonSchema = OpenApiJsonSchema.make(schema)
  expect(jsonSchema).toStrictEqual(expected)
  return jsonSchema
}

describe("parseJson", () => {
  describe(`target: "JsonSchema7"`, () => {
    describe(`should generate JSON Schemas by targeting the "from" side of parseJson`, () => {
      it("Struct", () => {
        const schema = Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString)
        }))
        expectJSONSchema(
          schema,
          { "type": "string" }
        )
      })

      it("Struct with TypeLiteralTransformations", () => {
        expectJSONSchema(
          Schema.parseJson(Schema.Struct({
            a: Schema.optionalWith(Schema.NonEmptyString, { default: () => "" })
          })),
          { "type": "string" }
        )
      })
    })
  })
})
