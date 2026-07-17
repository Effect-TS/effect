import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

describe("SchemaRepresentation.toRepresentations", () => {
  it("preserves root order", () => {
    const document = SchemaRepresentation.toRepresentations([
      Schema.String.ast,
      Schema.Number.ast,
      Schema.Boolean.ast
    ])

    assert.deepStrictEqual(document, {
      representations: [
        { _tag: "String", checks: [] },
        { _tag: "Number", checks: [] },
        { _tag: "Boolean", checks: [] }
      ],
      references: {}
    })
  })

  it("shares a named reference between roots", () => {
    const shared = Schema.String.annotate({ identifier: "Shared" })
    const document = SchemaRepresentation.toRepresentations([shared.ast, shared.ast])

    assert.deepStrictEqual(document, {
      representations: [
        { _tag: "Reference", $ref: "Shared" },
        { _tag: "Reference", $ref: "Shared" }
      ],
      references: {
        Shared: {
          _tag: "String",
          annotations: { identifier: "Shared" },
          checks: []
        }
      }
    })
  })

  it("assigns distinct references to different schemas with the same identifier", () => {
    const first = Schema.String.annotate({ identifier: "Value", description: "first" })
    const second = Schema.Number.annotate({ identifier: "Value", description: "second" })
    const document = SchemaRepresentation.toRepresentations([first.ast, second.ast])

    assert.deepStrictEqual(document, {
      representations: [
        { _tag: "Reference", $ref: "Value" },
        { _tag: "Reference", $ref: "Value1" }
      ],
      references: {
        Value: {
          _tag: "String",
          annotations: { identifier: "Value", description: "first" },
          checks: []
        },
        Value1: {
          _tag: "Number",
          annotations: { identifier: "Value", description: "second" },
          checks: []
        }
      }
    })
  })

  it("reuses a reference for equivalent schemas with the same identifier", () => {
    const first = Schema.String.annotate({ identifier: "Value" })
    const second = Schema.String.annotate({ identifier: "Value" })
    const document = SchemaRepresentation.toRepresentations([first.ast, second.ast])

    assert.deepStrictEqual(document, {
      representations: [
        { _tag: "Reference", $ref: "Value" },
        { _tag: "Reference", $ref: "Value" }
      ],
      references: {
        Value: {
          _tag: "String",
          annotations: { identifier: "Value" },
          checks: []
        }
      }
    })
  })
})
