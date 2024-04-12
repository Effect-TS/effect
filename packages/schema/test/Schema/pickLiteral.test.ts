import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/literal > pickLiteral", () => {
  it("should return an unwrapped AST with exactly one literal", () => {
    expect(S.Literal("a").pipe(S.PickLiteral("a")).ast).toEqual(new AST.Literal("a"))
  })

  it("should return a union with more than one literal", () => {
    expect(S.Literal("a", "b", "c").pipe(S.PickLiteral("a", "b")).ast).toEqual(
      AST.Union.make([new AST.Literal("a"), new AST.Literal("b")])
    )
  })

  describe("decoding", () => {
    it("1 member", async () => {
      const schema = S.Literal("a").pipe(S.PickLiteral("a"))
      await Util.expectDecodeUnknownSuccess(schema, "a")

      await Util.expectDecodeUnknownFailure(schema, 1, `Expected "a", actual 1`)
      await Util.expectDecodeUnknownFailure(schema, null, `Expected "a", actual null`)
    })

    it("2 members", async () => {
      const schema = S.Literal("a", "b", "c").pipe(S.PickLiteral("a", "b"))

      await Util.expectDecodeUnknownSuccess(schema, "a")
      await Util.expectDecodeUnknownSuccess(schema, "b")

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `"a" | "b"
├─ Union member
│  └─ Expected "a", actual null
└─ Union member
   └─ Expected "b", actual null`
      )
    })
  })

  it("encoding", async () => {
    const schema = S.Literal(null).pipe(S.PickLiteral(null))
    await Util.expectEncodeSuccess(schema, null, null)
  })
})
