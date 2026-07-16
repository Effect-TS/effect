import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

describe("SchemaRepresentation.fromSchemaMultiDocument", () => {
  it("preserves root order and lowers direct definitions", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.fromSchemaMultiDocument({
        schemas: [Schema.String, Schema.Boolean],
        definitions: { Value: Schema.Number }
      }),
      {
        representations: [
          { _tag: "String", checks: [] },
          { _tag: "Boolean", checks: [] }
        ],
        references: { Value: { _tag: "Number", checks: [] } }
      }
    )
  })

  it("keeps distinct keys for definitions sharing the same schema", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.fromSchemaMultiDocument({
        schemas: [Schema.String],
        definitions: { A: Schema.Number, B: Schema.Number }
      }),
      {
        representations: [{ _tag: "String", checks: [] }],
        references: {
          A: { _tag: "Reference", $ref: "B" },
          B: { _tag: "Number", checks: [] }
        }
      }
    )
  })
})
