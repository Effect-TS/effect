import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > array", () => {
  it("annotations()", () => {
    const schema = S.array(S.string).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the value", () => {
    const schema = S.array(S.string)
    expect(schema.value).toStrictEqual(S.string)
  })
})
