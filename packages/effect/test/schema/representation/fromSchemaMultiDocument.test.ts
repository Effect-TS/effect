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

  it("restores the identifier of an external definition", () => {
    const Value = Schema.Number
    const representation = SchemaRepresentation.fromSchemaMultiDocument({
      schemas: [Value],
      definitions: { Value }
    })
    const document = SchemaRepresentation.fromRepresentations(representation, { revivers: [] })

    assert.strictEqual(document.schemas[0], document.definitions.Value)
    assert.strictEqual(document.definitions.Value.ast._tag, "Number")
    assert.deepStrictEqual(SchemaRepresentation.toRepresentation(document.schemas[0].ast).representation, {
      _tag: "Reference",
      $ref: "Value"
    })
    assert.deepStrictEqual(Object.keys(SchemaRepresentation.fromSchemaMultiDocument(document).references), ["Value"])
  })
})
