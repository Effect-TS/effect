import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { deepStrictEqual, doesNotThrow } from "effect/test/util"
import { describe, it } from "vitest"

describe("pick", () => {
  it("refinement", async () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number }).pipe(S.filter(() => true))
    const ast = schema.pipe(S.pick("a")).ast
    deepStrictEqual(ast, S.Struct({ a: S.NumberFromString }).ast)
  })

  it("struct", async () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number })
    const ast = schema.pipe(S.pick("a")).ast
    deepStrictEqual(ast, S.Struct({ a: S.NumberFromString }).ast)
  })

  it("struct + record", async () => {
    const schema = S.Struct(
      { a: S.NumberFromString, b: S.Number },
      S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
    )
    const ast = schema.pipe(S.pick("a", "c")).ast
    deepStrictEqual(ast, S.Struct({ a: S.NumberFromString, c: S.Union(S.String, S.Number) }).ast)
  })

  it("union", async () => {
    const A = S.Struct({ a: S.String })
    const B = S.Struct({ a: S.Number })
    const schema = S.Union(A, B)
    const pick = schema.pipe(S.pick("a"))
    const ast = pick.ast
    deepStrictEqual(ast, S.Struct({ a: S.Union(S.String, S.Number) }).ast)
  })

  describe("transformation", () => {
    it("ComposeTransformation", async () => {
      const schema = S.compose(
        S.Struct({ a: S.NumberFromString, b: S.Number }),
        S.Struct({ a: S.Number, b: S.Number })
      )
      const ast = schema.pipe(S.pick("a")).ast
      deepStrictEqual(ast, S.compose(S.Struct({ a: S.NumberFromString }), S.Struct({ a: S.Number })).ast)
    })

    describe("TypeLiteralTransformation", () => {
      it("picking keys with associated PropertySignatureTransformations", async () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.Number })
        const pick = schema.pipe(S.pick("a"))
        const ast = pick.ast as AST.Transformation
        deepStrictEqual(ast.from, S.Struct({ a: S.optional(S.NumberFromString) }).ast)
        deepStrictEqual(ast.to, S.Struct({ a: S.Number }).ast)
        deepStrictEqual(ast.transformation, (schema.ast as AST.Transformation).transformation)
        doesNotThrow(() => pick.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })

      it("picking keys without associated PropertySignatureTransformations", async () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.NumberFromString })
        const pick = schema.pipe(S.pick("b"))
        const ast = pick.ast as AST.TypeLiteral
        deepStrictEqual(ast.propertySignatures, [
          new AST.PropertySignature("b", S.NumberFromString.ast, false, true)
        ])
        doesNotThrow(() => pick.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })
    })

    describe("SurrogateAnnotation", () => {
      it("a single Class", async () => {
        class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.Number }) {}
        const schema = A
        const ast = schema.pipe(S.pick("a")).ast
        deepStrictEqual(ast, S.Struct({ a: S.NumberFromString }).ast)
      })

      it("a union of Classes", async () => {
        class A extends S.Class<A>("A")({ a: S.Number }) {}
        class B extends S.Class<B>("B")({ a: S.String }) {}
        const schema = S.Union(A, B)
        const pick = schema.pipe(S.pick("a"))
        const ast = pick.ast
        deepStrictEqual(ast, S.Struct({ a: S.Union(S.Number, S.String) }).ast)
      })
    })
  })
})
