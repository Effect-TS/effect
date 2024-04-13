import type * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > pick", () => {
  it("TypeLiteral", async () => {
    const schema = S.struct({ a: S.NumberFromString, b: S.number })
    const ast = schema.pipe(S.pick("a")).ast
    expect(ast).toStrictEqual(S.struct({ a: S.NumberFromString }).ast)
  })

  describe("transformation", () => {
    it("ComposeTransformation", async () => {
      const schema = S.compose(S.struct({ a: S.NumberFromString, b: S.number }), S.struct({ a: S.number, b: S.number }))
      const ast = schema.pipe(S.pick("a")).ast
      expect(ast).toStrictEqual(S.compose(S.struct({ a: S.NumberFromString }), S.struct({ a: S.number })).ast)
    })

    it("TypeLiteralTransformation", async () => {
      const schema = S.struct({ a: S.optional(S.NumberFromString, { default: () => 0 }), b: S.number })
      const ast = schema.pipe(S.pick("a")).ast as AST.Transformation
      expect(ast.from).toStrictEqual(S.struct({ a: S.optional(S.NumberFromString) }).ast)
      expect(ast.to).toStrictEqual(S.struct({ a: S.number }).ast)
      expect(ast.transformation).toStrictEqual((schema.ast as AST.Transformation).transformation)

      const schema2 = S.struct({
        a: S.propertySignature(S.number).pipe(S.fromKey('c')),
        b: S.number,
      })
      const ast2 = schema2.pipe(S.pick("a")).ast as AST.Transformation
      expect(ast2.from).toStrictEqual(S.struct({ c: S.number }).ast)
      expect(ast2.to).toStrictEqual(S.struct({ a: S.number }).ast)
      expect(ast2.transformation).toStrictEqual((schema2.ast as AST.Transformation).transformation)
    })

    it("with SurrogateAnnotation", async () => {
      class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.number }) {}
      const schema = A
      const ast = schema.pipe(S.pick("a")).ast
      expect(ast).toStrictEqual(S.struct({ a: S.NumberFromString }).ast)
    })
  })
})
