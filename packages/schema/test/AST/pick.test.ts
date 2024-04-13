import type * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > pick", () => {
  it("TypeLiteral", async () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number })
    const ast = schema.pipe(S.pick("a")).ast
    expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString }).ast)
  })

  describe("transformation", () => {
    it("ComposeTransformation", async () => {
      const schema = S.compose(
        S.Struct({ a: S.NumberFromString, b: S.Number }),
        S.Struct({ a: S.Number, b: S.Number })
      )
      const ast = schema.pipe(S.pick("a")).ast
      expect(ast).toStrictEqual(S.compose(S.Struct({ a: S.NumberFromString }), S.Struct({ a: S.Number })).ast)
    })

    it("TypeLiteralTransformation", async () => {
      const schema = S.Struct({ a: S.optional(S.NumberFromString, { default: () => 0 }), b: S.Number })
      const ast = schema.pipe(S.pick("a")).ast as AST.Transformation
      expect(ast.from).toStrictEqual(S.Struct({ a: S.optional(S.NumberFromString) }).ast)
      expect(ast.to).toStrictEqual(S.Struct({ a: S.Number }).ast)
      expect(ast.transformation).toStrictEqual((schema.ast as AST.Transformation).transformation)
    })

    it("with SurrogateAnnotation", async () => {
      class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.Number }) {}
      const schema = A
      const ast = schema.pipe(S.pick("a")).ast
      expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString }).ast)
    })
  })
})
