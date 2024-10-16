import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("nonEmptyArray", () => {
  it("annotations()", () => {
    const schema = S.NonEmptyArray(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the value", () => {
    const schema = S.NonEmptyArray(S.String)
    expect(schema.value).toStrictEqual(S.String)
  })
})
