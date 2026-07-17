import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

describe("SchemaRepresentation.DocumentFromJson", () => {
  it("decodes persisted documents", () => {
    const input = {
      representation: {
        _tag: "Literal",
        literal: { _tag: "BigInt", value: "1" },
        checks: []
      },
      references: {}
    } as const

    assert.deepStrictEqual(
      Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(input),
      {
        representation: { _tag: "Literal", literal: 1n, checks: [] },
        references: {}
      }
    )
  })

  it("encodes live documents", () => {
    const input: SchemaRepresentation.Document = {
      representation: { _tag: "Literal", literal: 1n, checks: [] },
      references: {}
    }

    assert.deepStrictEqual(
      Schema.encodeSync(SchemaRepresentation.DocumentFromJson)(input),
      {
        representation: {
          _tag: "Literal",
          literal: { _tag: "BigInt", value: "1" },
          checks: []
        },
        references: {}
      }
    )
  })

  it("ignores excess properties by default", () => {
    assert.deepStrictEqual(
      Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)({
        representation: { _tag: "String", checks: [], unexpected: true },
        references: {},
        unexpected: true
      }),
      {
        representation: { _tag: "String", checks: [] },
        references: {}
      }
    )
  })

  it("reports decoding failures as SchemaError", () => {
    const result = Schema.decodeUnknownResult(SchemaRepresentation.DocumentFromJson)(() => undefined)

    assert.strictEqual(result._tag, "Failure")
    if (result._tag !== "Failure") return
    assert.strictEqual(result.failure.message, "Expected object, got () => void 0")
  })

  it("reports encoding failures as SchemaError", () => {
    const result = Schema.encodeUnknownResult(SchemaRepresentation.DocumentFromJson)({
      representation: { _tag: "Reference", $ref: "" },
      references: {}
    })

    assert.strictEqual(result._tag, "Failure")
    if (result._tag !== "Failure") return
    assert.strictEqual(
      result.failure.message,
      `Expected <filter>, got ""\n  at ["representation"]["$ref"]`
    )
  })
})
