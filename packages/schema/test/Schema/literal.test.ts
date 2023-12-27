import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/literal", () => {
  it("should return never with no literals", () => {
    expect(S.literal().ast).toEqual(AST.neverKeyword)
  })

  it("should return an unwrapped AST with exactly one literal", () => {
    expect(S.literal(1).ast).toEqual(AST.createLiteral(1))
  })

  it("should return a union with more than one literal", () => {
    expect(S.literal(1, 2).ast).toEqual(
      AST.createUnion([AST.createLiteral(1), AST.createLiteral(2)])
    )
  })

  describe("decoding", () => {
    it("1 member", async () => {
      const schema = S.literal(1)
      await Util.expectParseSuccess(schema, 1)

      await Util.expectParseFailure(schema, "a", `Expected 1, actual "a"`)
      await Util.expectParseFailure(schema, null, `Expected 1, actual null`)
    })

    it("2 members", async () => {
      const schema = S.literal(1, "a")
      await Util.expectParseSuccess(schema, 1)
      await Util.expectParseSuccess(schema, "a")

      await Util.expectParseFailureTree(
        schema,
        null,
        `error(s) found
├─ union member
│  └─ Expected 1, actual null
└─ union member
   └─ Expected "a", actual null`
      )
    })
  })

  it("encoding", async () => {
    const schema = S.literal(null)
    await Util.expectEncodeSuccess(schema, null, null)
  })
})
