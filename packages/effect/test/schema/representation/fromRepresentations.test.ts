import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

function decode(schema: Schema.Top, input: unknown): unknown {
  return Schema.decodeUnknownSync(schema as Schema.Codec<unknown>)(input)
}

describe("SchemaRepresentation.fromRepresentations", () => {
  it("preserves root order", () => {
    const document = SchemaRepresentation.fromRepresentations({
      representations: [
        { _tag: "String", checks: [] },
        { _tag: "Boolean", checks: [] },
        { _tag: "Number", checks: [] }
      ],
      references: {}
    }, { revivers: [] })

    assert.strictEqual(decode(document.schemas[0], "value"), "value")
    assert.strictEqual(decode(document.schemas[1], true), true)
    assert.strictEqual(decode(document.schemas[2], 1), 1)
  })

  it("revives unreachable definitions", () => {
    const document = SchemaRepresentation.fromRepresentations({
      representations: [{ _tag: "String", checks: [] }],
      references: { Unused: { _tag: "Number", checks: [] } }
    }, { revivers: [] })

    assert.deepStrictEqual(Object.keys(document.definitions), ["Unused"])
    assert.strictEqual(decode(document.definitions.Unused, 1), 1)
  })

  it("preserves aliases as distinct reference wrappers", () => {
    const document = SchemaRepresentation.fromRepresentations({
      representations: [{ _tag: "Reference", $ref: "Alias" }],
      references: {
        Value: { _tag: "String", checks: [] },
        Alias: { _tag: "Reference", $ref: "Value" }
      }
    }, { revivers: [] })

    assert.notStrictEqual(document.definitions.Value, document.definitions.Alias)
    assert.strictEqual(document.definitions.Value.ast._tag, "Suspend")
    assert.strictEqual(document.definitions.Alias.ast._tag, "Suspend")
    assert.strictEqual(decode(document.schemas[0], "value"), "value")
    assert.deepStrictEqual(SchemaRepresentation.toRepresentation(document.schemas[0].ast).representation, {
      _tag: "Reference",
      $ref: "Alias"
    })
  })

  it("revives recursive definitions", () => {
    const document = SchemaRepresentation.fromRepresentations({
      representations: [{ _tag: "Reference", $ref: "Recursive" }],
      references: {
        Recursive: {
          _tag: "Objects",
          checks: [],
          propertySignatures: [
            {
              name: "value",
              type: { _tag: "Number", checks: [] },
              isOptional: false,
              isMutable: false
            },
            {
              name: "next",
              type: { _tag: "Reference", $ref: "Recursive" },
              isOptional: true,
              isMutable: false
            }
          ],
          indexSignatures: []
        }
      }
    }, { revivers: [] })

    assert.deepStrictEqual(
      decode(document.schemas[0], {
        value: 1,
        next: { value: 2 }
      }),
      {
        value: 1,
        next: { value: 2 }
      }
    )
  })
})
