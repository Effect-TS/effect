import { describe, it } from "@effect/vitest"
import { assertInstanceOf, deepStrictEqual } from "@effect/vitest/utils"
import * as AST from "effect/SchemaAST"

describe("annotations", () => {
  it("should add annotations", () => {
    const symA = Symbol.for("a")
    const ast = AST.annotations(AST.stringKeyword, { [symA]: "A" })
    assertInstanceOf(ast, AST.StringKeyword)
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
