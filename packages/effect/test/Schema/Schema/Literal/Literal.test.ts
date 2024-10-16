import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Literal", () => {
  it("annotations()", () => {
    const schema = S.Literal(1).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the literals", () => {
    const schema = S.Literal("a", "b")
    expect(schema.literals).toStrictEqual(["a", "b"])
  })

  it("should return an unwrapped AST with exactly one literal", () => {
    expect(S.Literal(1).ast).toEqual(new AST.Literal(1))
  })

  it("should return a union with more than one literal", () => {
    expect(S.Literal(1, 2).ast).toEqual(
      AST.Union.make([new AST.Literal(1), new AST.Literal(2)])
    )
  })

  it("should return the literal interface when using the .annotations() method", () => {
    const schema = S.Literal("a", "b").annotations({ identifier: "literal test" })
    expect(schema.ast.annotations).toStrictEqual({ [AST.IdentifierAnnotationId]: "literal test" })
    expect(schema.literals).toStrictEqual(["a", "b"])
  })

  describe("decoding", () => {
    it("1 member", async () => {
      const schema = S.Literal(1)
      await Util.expectDecodeUnknownSuccess(schema, 1)

      await Util.expectDecodeUnknownFailure(schema, "a", `Expected 1, actual "a"`)
      await Util.expectDecodeUnknownFailure(schema, null, `Expected 1, actual null`)
    })

    it("2 members", async () => {
      const schema = S.Literal(1, "a")
      await Util.expectDecodeUnknownSuccess(schema, 1)
      await Util.expectDecodeUnknownSuccess(schema, "a")

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `1 | "a"
├─ Expected 1, actual null
└─ Expected "a", actual null`
      )
    })
  })

  it("encoding", async () => {
    const schema = S.Literal(null)
    await Util.expectEncodeSuccess(schema, null, null)
  })
})
