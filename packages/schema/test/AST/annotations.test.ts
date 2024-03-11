import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST > annotations", () => {
  it("annotations", () => {
    const symA = Symbol.for("a")
    const ast = AST.annotations(AST.stringKeyword, { [symA]: "A" })
    expect(ast instanceof AST.StringKeyword).toBe(true)
    expect(ast).toStrictEqual(
      new AST.StringKeyword({
        [AST.TitleAnnotationId]: "string",
        [AST.DescriptionAnnotationId]: "a string",
        [symA]: "A"
      })
    )
    expect(AST.stringKeyword).toStrictEqual(
      new AST.StringKeyword({
        [AST.TitleAnnotationId]: "string",
        [AST.DescriptionAnnotationId]: "a string"
      })
    )
  })
})
