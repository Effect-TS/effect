import * as AST from "effect/SchemaAST"
import { assertTrue, deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("annotations", () => {
  it("should add annotations", () => {
    const symA = Symbol.for("a")
    const ast = AST.annotations(AST.stringKeyword, { [symA]: "A" })
    assertTrue(ast instanceof AST.StringKeyword)
    deepStrictEqual(
      ast,
      new AST.StringKeyword({
        [AST.TitleAnnotationId]: "string",
        [AST.DescriptionAnnotationId]: "a string",
        [symA]: "A"
      })
    )
    deepStrictEqual(
      AST.stringKeyword,
      new AST.StringKeyword({
        [AST.TitleAnnotationId]: "string",
        [AST.DescriptionAnnotationId]: "a string"
      })
    )
  })
})
