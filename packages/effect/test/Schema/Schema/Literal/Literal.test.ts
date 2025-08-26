import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../../TestUtils.js"

describe("Literal", () => {
  it("should expose the literals", () => {
    const schema = S.Literal("a", "b")
    deepStrictEqual(schema.literals, ["a", "b"])
  })

  it("should return Never when no literals are provided", () => {
    strictEqual(S.Literal(), S.Never)
    strictEqual(S.Literal(...[]), S.Never)
  })

  it("should return an unwrapped AST with exactly one literal", () => {
    deepStrictEqual(S.Literal(1).ast, new AST.Literal(1))
  })

  it("should return a union with more than one literal", () => {
    deepStrictEqual(S.Literal(1, 2).ast, AST.Union.make([new AST.Literal(1), new AST.Literal(2)]))
  })

  it("should return the literal interface when using the .annotations() method", () => {
    const schema = S.Literal("a", "b").annotations({ identifier: "literal test" })
    deepStrictEqual(schema.ast.annotations, { [AST.IdentifierAnnotationId]: "literal test" })
    deepStrictEqual(schema.literals, ["a", "b"])
  })

  describe("decoding", () => {
    it("1 member", async () => {
      const schema = S.Literal(1)
      await Util.assertions.decoding.succeed(schema, 1)

      await Util.assertions.decoding.fail(schema, "a", `Expected 1, actual "a"`)
      await Util.assertions.decoding.fail(schema, null, `Expected 1, actual null`)
    })

    it("2 members", async () => {
      const schema = S.Literal(1, "a")
      await Util.assertions.decoding.succeed(schema, 1)
      await Util.assertions.decoding.succeed(schema, "a")

      await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(schema, null, null)
  })
})
