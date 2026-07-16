import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

describe("SchemaRepresentation.MultiDocumentFromJson", () => {
  it("decodes persisted multi-documents", () => {
    const input = {
      representations: [
        {
          _tag: "Literal",
          literal: { _tag: "BigInt", value: "1" },
          checks: []
        },
        { _tag: "String", checks: [] }
      ],
      references: {}
    } as const

    assert.deepStrictEqual(
      Schema.decodeUnknownSync(SchemaRepresentation.MultiDocumentFromJson)(input),
      {
        representations: [
          { _tag: "Literal", literal: 1n, checks: [] },
          { _tag: "String", checks: [] }
        ],
        references: {}
      }
    )
  })

  it("encodes live multi-documents", () => {
    const input: SchemaRepresentation.MultiDocument = {
      representations: [
        { _tag: "Literal", literal: 1n, checks: [] },
        { _tag: "String", checks: [] }
      ],
      references: {}
    }

    assert.deepStrictEqual(
      Schema.encodeSync(SchemaRepresentation.MultiDocumentFromJson)(input),
      {
        representations: [
          {
            _tag: "Literal",
            literal: { _tag: "BigInt", value: "1" },
            checks: []
          },
          { _tag: "String", checks: [] }
        ],
        references: {}
      }
    )
  })
})
