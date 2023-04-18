import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("TemplateLiteral", () => {
  it("should throw on unsupported template literal spans", () => {
    expect(() => S.templateLiteral(S.boolean)).toThrowError(
      new Error("templateLiteral: unsupported template literal span BooleanKeyword")
    )
  })

  describe.concurrent("AST", () => {
    it("a", () => {
      const schema = S.templateLiteral(S.literal("a"))
      expect(schema.ast).toEqual(AST.createLiteral("a"))
    })

    it("a b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
      expect(schema.ast).toEqual(
        AST.createLiteral("a b")
      )
    })

    it("(a | b) c", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"))
      expect(schema.ast).toEqual(
        AST.createUnion([AST.createLiteral("ac"), AST.createLiteral("bc")])
      )
    })

    it("(a | b) c (d | e)", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"), S.literal("d", "e"))
      expect(schema.ast).toEqual(
        AST.createUnion([
          AST.createLiteral("acd"),
          AST.createLiteral("ace"),
          AST.createLiteral("bcd"),
          AST.createLiteral("bce")
        ])
      )
    })

    it("(a | b) string (d | e)", () => {
      const schema = S.templateLiteral(S.literal("a", "b"), S.string, S.literal("d", "e"))
      expect(schema.ast).toEqual(
        AST.createUnion([
          AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "d" }]),
          AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "e" }]),
          AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "d" }]),
          AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "e" }])
        ])
      )
    })

    it("a${string}", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string)
      expect(schema.ast).toEqual(
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "" }])
      )
    })

    it("a${string}b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      expect(schema.ast).toEqual(
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "b" }])
      )
    })
  })

  describe.concurrent("Decoder", () => {
    it("a", async () => {
      const schema = S.templateLiteral(S.literal("a"))
      await Util.expectParseSuccess(schema, "a", "a")

      await Util.expectParseFailure(schema, "ab", `Expected "a", actual "ab"`)
      await Util.expectParseFailure(schema, "", `Expected "a", actual ""`)
      await Util.expectParseFailure(schema, null, `Expected "a", actual null`)
    })

    it("a b", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
      await Util.expectParseSuccess(schema, "a b", "a b")

      await Util.expectParseFailure(schema, "a  b", `Expected "a b", actual "a  b"`)
    })

    it("a${string}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string)
      await Util.expectParseSuccess(schema, "a", "a")
      await Util.expectParseSuccess(schema, "ab", "ab")

      await Util.expectParseFailure(
        schema,
        null,
        "Expected a${string}, actual null"
      )
      await Util.expectParseFailure(
        schema,
        "",
        "Expected a${string}, actual \"\""
      )
    })

    it("a${number}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.number)
      await Util.expectParseSuccess(schema, "a1", "a1")
      await Util.expectParseSuccess(schema, "a1.2", "a1.2")

      await Util.expectParseFailure(
        schema,
        null,
        "Expected a${number}, actual null"
      )
      await Util.expectParseFailure(
        schema,
        "",
        "Expected a${number}, actual \"\""
      )
      await Util.expectParseFailure(
        schema,
        "aa",
        "Expected a${number}, actual \"aa\""
      )
    })

    it("${string}", async () => {
      const schema = S.templateLiteral(S.string)
      await Util.expectParseSuccess(schema, "a", "a")
      await Util.expectParseSuccess(schema, "ab", "ab")
      await Util.expectParseSuccess(schema, "", "")
    })

    it("a${string}b", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      await Util.expectParseSuccess(schema, "ab", "ab")
      await Util.expectParseSuccess(schema, "acb", "acb")
      await Util.expectParseSuccess(schema, "abb", "abb")
      await Util.expectParseFailure(
        schema,
        "",
        "Expected a${string}b, actual \"\""
      )
      await Util.expectParseFailure(
        schema,
        "a",
        "Expected a${string}b, actual \"a\""
      )
      await Util.expectParseFailure(
        schema,
        "b",
        "Expected a${string}b, actual \"b\""
      )
      await Util.expectEncodeSuccess(schema, "acb", "acb")
    })

    it("a${string}b${string}", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"), S.string)
      await Util.expectParseSuccess(schema, "ab", "ab")
      await Util.expectParseSuccess(schema, "acb", "acb")
      await Util.expectParseSuccess(schema, "acbd", "acbd")

      await Util.expectParseFailure(
        schema,
        "a",
        "Expected a${string}b${string}, actual \"a\""
      )
      await Util.expectParseFailure(
        schema,
        "b",
        "Expected a${string}b${string}, actual \"b\""
      )
    })

    it("https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", async () => {
      const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
      const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")
      const schema = S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))
      await Util.expectParseSuccess(schema, "welcome_email_id", "welcome_email_id")
      await Util.expectParseSuccess(schema, "email_heading_id", "email_heading_id")
      await Util.expectParseSuccess(schema, "footer_title_id", "footer_title_id")
      await Util.expectParseSuccess(schema, "footer_sendoff_id", "footer_sendoff_id")

      await Util.expectParseFailureTree(
        schema,
        "_id",
        `error(s) found
├─ union member
│  └─ Expected "welcome_email_id", actual "_id"
├─ union member
│  └─ Expected "email_heading_id", actual "_id"
├─ union member
│  └─ Expected "footer_title_id", actual "_id"
└─ union member
   └─ Expected "footer_sendoff_id", actual "_id"`
      )
    })
  })
})
