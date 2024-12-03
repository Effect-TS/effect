import * as Schema from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("TemplateLiteralParser", () => {
  it("should throw on unsupported template literal spans", () => {
    expect(() => Schema.TemplateLiteralParser(Schema.Boolean)).toThrow(
      new Error(`Unsupported template literal span
schema (BooleanKeyword): boolean`)
    )
    expect(() => Schema.TemplateLiteralParser(Schema.SymbolFromSelf)).toThrow(
      new Error(`Unsupported template literal span
schema (SymbolKeyword): symbol`)
    )
  })

  it("should expose the params", () => {
    const params = ["/", Schema.Int, "/", Schema.String] as const
    const schema = Schema.TemplateLiteralParser(...params)
    expect(schema.params).toStrictEqual(params)
  })

  describe("string literal based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser("foo")
      await Util.expectDecodeUnknownSuccess(schema, "foo", ["foo"])
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser("foo")
      await Util.expectEncodeSuccess(schema, ["foo"], "foo")
    })
  })

  describe("literal based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Literal("foo"))
      await Util.expectDecodeUnknownSuccess(schema, "foo", ["foo"])
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Literal("foo"))
      await Util.expectEncodeSuccess(schema, ["foo"], "foo")
    })
  })

  describe("literal union based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Literal("foo", "bar"))
      await Util.expectDecodeUnknownSuccess(schema, "foo", ["foo"])
      await Util.expectDecodeUnknownSuccess(schema, "bar", ["bar"])
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Literal("foo", "bar"))
      await Util.expectEncodeSuccess(schema, ["foo"], "foo")
      await Util.expectEncodeSuccess(schema, ["bar"], "bar")
    })
  })

  describe("union of literals based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Union(Schema.Literal("foo")))
      await Util.expectDecodeUnknownSuccess(schema, "foo", ["foo"])
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Union(Schema.Literal("foo")))
      await Util.expectEncodeSuccess(schema, ["foo"], "foo")
    })
  })

  describe("complex literal schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(
        Schema.Union(Schema.Literal("foo", "bar"), Schema.Literal("baz")),
        "cux"
      )

      await Util.expectDecodeUnknownSuccess(schema, "foocux", ["foo", "cux"])
      await Util.expectDecodeUnknownSuccess(schema, "barcux", ["bar", "cux"])
      await Util.expectDecodeUnknownSuccess(schema, "bazcux", ["baz", "cux"])
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(
        Schema.Union(Schema.Literal("foo", "bar"), Schema.Literal("baz")),
        "cux"
      )

      await Util.expectEncodeSuccess(schema, ["foo", "cux"], "foocux")
      await Util.expectEncodeSuccess(schema, ["bar", "cux"], "barcux")
      await Util.expectEncodeSuccess(schema, ["baz", "cux"], "bazcux")
    })
  })

  describe("number based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Int, "a")
      await Util.expectDecodeUnknownSuccess(schema, "1a", [1, "a"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1.1a",
        `(\`\${number}a\` <-> readonly [Int, "a"])
└─ Type side transformation failure
   └─ readonly [Int, "a"]
      └─ [0]
         └─ Int
            └─ Predicate refinement failure
               └─ Expected Int, actual 1.1`
      )
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Int, "a", Schema.Char)
      await Util.expectEncodeSuccess(schema, [1, "a", "b"], "1ab")
      await Util.expectEncodeFailure(
        schema,
        [1.1, "a", ""],
        `(\`\${number}a\${string}\` <-> readonly [Int, "a", Char])
└─ Type side transformation failure
   └─ readonly [Int, "a", Char]
      └─ [0]
         └─ Int
            └─ Predicate refinement failure
               └─ Expected Int, actual 1.1`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "a", ""],
        `(\`\${number}a\${string}\` <-> readonly [Int, "a", Char])
└─ Type side transformation failure
   └─ readonly [Int, "a", Char]
      └─ [2]
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char, actual ""`
      )
    })
  })

  describe("string based schemas", () => {
    it("decoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)
      await Util.expectDecodeUnknownSuccess(schema, "100ab", [100, "a", "b"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "-ab",
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", NonEmptyString])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", NonEmptyString]
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "-"`
      )
    })

    it("encoding", async () => {
      const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.Char)
      await Util.expectEncodeSuccess(schema, [100, "a", "b"], "100ab")
      await Util.expectEncodeFailure(
        schema,
        [100, "a", ""],
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", Char])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", Char]
      └─ [2]
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char, actual ""`
      )
    })
  })
})
