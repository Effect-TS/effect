import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > PropertySignature", () => {
  it("asPropertySignature().annotations()", () => {
    const schema = S.struct({
      a: S.asPropertySignature(S.string).annotations({
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("optional().annotations()", () => {
    const schema = S.struct({
      a: S.optional(S.string).annotations({
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("should return the same reference when using .annotations(undefined)", () => {
    const ps = S.asPropertySignature(S.string)
    const copy = ps.annotations(undefined)
    expect(ps === copy).toBe(true)
  })
})
