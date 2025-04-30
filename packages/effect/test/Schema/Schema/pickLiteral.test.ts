import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("pickLiteral", () => {
  it("should return an unwrapped AST with exactly one literal", () => {
    deepStrictEqual(S.Literal("a").pipe(S.pickLiteral("a")).ast, new AST.Literal("a"))
  })

  it("should return a union with more than one literal", () => {
    deepStrictEqual(
      S.Literal("a", "b", "c").pipe(S.pickLiteral("a", "b")).ast,
      AST.Union.make([new AST.Literal("a"), new AST.Literal("b")])
    )
  })

  describe("decoding", () => {
    it("1 member", async () => {
      const schema = S.Literal("a").pipe(S.pickLiteral("a"))
      await Util.assertions.decoding.succeed(schema, "a")

      await Util.assertions.decoding.fail(schema, 1, `Expected "a", actual 1`)
      await Util.assertions.decoding.fail(schema, null, `Expected "a", actual null`)
    })

    it("2 members", async () => {
      const schema = S.Literal("a", "b", "c").pipe(S.pickLiteral("a", "b"))

      await Util.assertions.decoding.succeed(schema, "a")
      await Util.assertions.decoding.succeed(schema, "b")

      await Util.assertions.decoding.fail(
        schema,
        null,
        `"a" | "b"
├─ Expected "a", actual null
└─ Expected "b", actual null`
      )
    })
  })

  it("encoding", async () => {
    const schema = S.Literal(null).pipe(S.pickLiteral(null))
    await Util.assertions.encoding.succeed(schema, null, null)
  })
})
