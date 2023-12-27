import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema/propertySignatureAnnotations", () => {
  it("should add property signature annotations to a schema", () => {
    const schema = S.struct({
      a: S.string.pipe(S.propertySignatureAnnotations({
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      }))
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("should add property signature annotations to a property signature", () => {
    const schema = S.struct({
      a: S.optional(S.string).pipe(S.propertySignatureAnnotations({
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      }))
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })
})
