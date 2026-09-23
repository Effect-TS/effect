import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

describe("JSON Schema exports of UTF-16 string lengths", () => {
  it("rejects misleading bounds without changing runtime validation", () => {
    const cases = [
      [Schema.isMinLength(2), true, "isMinCodePoints"],
      [Schema.isMaxLength(1), false, "isMaxCodePoints"],
      [Schema.isBetweenLength(1, 1), false, "isBetweenCodePoints"]
    ] as const

    for (const [check, acceptsEmoji, alternative] of cases) {
      const schema = Schema.String.check(check)
      assert.strictEqual(Schema.is(schema)("😀"), acceptsEmoji)
      assert.throws(() => Schema.toJsonSchemaDocument(schema), alternative)
      assert.throws(
        () => SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(schema)),
        alternative
      )
    }
  })

  it("preserves equivalent empty and non-empty string bounds", () => {
    for (
      const [check, keywords] of [
        [Schema.isMinLength(0), { minLength: 0 }],
        [Schema.isMinLength(1), { minLength: 1 }],
        [Schema.isMaxLength(0), { maxLength: 0 }],
        [Schema.isBetweenLength(0, 0), { allOf: [{ minLength: 0 }, { maxLength: 0 }] }]
      ] as const
    ) {
      assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.String.check(check)).schema, {
        type: "string",
        ...keywords
      })
    }
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.NonEmptyString).schema, {
      type: "string",
      minLength: 1
    })
  })

  it("allows an explicit check annotation to describe UTF-16 semantics", () => {
    const schema = Schema.String.check(Schema.isMaxLength(1, {
      toJsonSchema: () => ({ pattern: "^[\\u0000-\\uFFFF]?(?![\\s\\S])" })
    }))
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(schema).schema, {
      type: "string",
      pattern: "^[\\u0000-\\uFFFF]?(?![\\s\\S])"
    })
    // oxlint-disable-next-line no-control-regex -- The range covers all UTF-16 code units, including controls.
    const validate = new RegExp("^[\\u0000-\\uFFFF]?(?![\\s\\S])", "u")
    for (const input of ["", "a", "é", "😀", "e\u0301", "\uD800", "\uDC00", "\n", "a\n"]) {
      assert.strictEqual(validate.test(input), Schema.is(schema)(input))
    }
  })

  it("reports unsupported bounds inside a property or definition", () => {
    const value = Schema.String.check(Schema.isMaxLength(2)).annotate({ identifier: "Label" })
    assert.throws(
      () => Schema.toJsonSchemaDocument(Schema.Struct({ value })),
      "isMaxCodePoints"
    )
  })

  it("preserves Char validation while rejecting its UTF-16 length export", () => {
    assert.isTrue(Schema.is(Schema.Char)("a"))
    assert.isFalse(Schema.is(Schema.Char)("😀"))
    assert.throws(() => Schema.toJsonSchemaDocument(Schema.Char), "isBetweenCodePoints")
  })
})
