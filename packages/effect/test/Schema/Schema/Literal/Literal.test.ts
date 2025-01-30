import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("Literal", () => {
  it("annotations()", () => {
    const schema = S.Literal(1).annotations({ identifier: "X" }).annotations({ title: "Y" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the literals", () => {
    const schema = S.Literal("a", "b")
    deepStrictEqual(schema.literals, ["a", "b"])
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
