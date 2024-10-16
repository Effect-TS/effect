import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("pick", () => {
  it("refinement", async () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number }).pipe(S.filter(() => true))
    const ast = schema.pipe(S.pick("a")).ast
    expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString }).ast)
  })

  it("struct", async () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number })
    const ast = schema.pipe(S.pick("a")).ast
    expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString }).ast)
  })

  it("struct + record", async () => {
    const schema = S.Struct(
      { a: S.NumberFromString, b: S.Number },
      S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
    )
    const ast = schema.pipe(S.pick("a", "c")).ast
    expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString, c: S.Union(S.String, S.Number) }).ast)
  })

  it("union", async () => {
    const A = S.Struct({ a: S.String })
    const B = S.Struct({ a: S.Number })
    const schema = S.Union(A, B)
    const pick = schema.pipe(S.pick("a"))
    const ast = pick.ast
    expect(ast).toStrictEqual(S.Struct({ a: S.Union(S.String, S.Number) }).ast)
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

    describe("TypeLiteralTransformation", () => {
      it("picking keys with associated PropertySignatureTransformations", async () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.Number })
        const pick = schema.pipe(S.pick("a"))
        const ast = pick.ast as AST.Transformation
        expect(ast.from).toStrictEqual(S.Struct({ a: S.optional(S.NumberFromString) }).ast)
        expect(ast.to).toStrictEqual(S.Struct({ a: S.Number }).ast)
        expect(ast.transformation).toStrictEqual((schema.ast as AST.Transformation).transformation)
        expect(() => pick.pipe(S.extend(S.Struct({ c: S.Boolean })))).not.Throw()
      })

      it("picking keys without associated PropertySignatureTransformations", async () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.NumberFromString })
        const pick = schema.pipe(S.pick("b"))
        const ast = pick.ast as AST.TypeLiteral
        expect(ast.propertySignatures).toStrictEqual([
          new AST.PropertySignature("b", S.NumberFromString.ast, false, true)
        ])
        expect(() => pick.pipe(S.extend(S.Struct({ c: S.Boolean })))).not.Throw()
      })
    })

    describe("SurrogateAnnotation", () => {
      it("a single Class", async () => {
        class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.Number }) {}
        const schema = A
        const ast = schema.pipe(S.pick("a")).ast
        expect(ast).toStrictEqual(S.Struct({ a: S.NumberFromString }).ast)
      })

      it("a union of Classes", async () => {
        class A extends S.Class<A>("A")({ a: S.Number }) {}
        class B extends S.Class<B>("B")({ a: S.String }) {}
        const schema = S.Union(A, B)
        const pick = schema.pipe(S.pick("a"))
        const ast = pick.ast
        expect(ast).toStrictEqual(S.Struct({ a: S.Union(S.Number, S.String) }).ast)
      })
    })
  })
})
