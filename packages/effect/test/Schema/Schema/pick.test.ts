import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, doesNotThrow, strictEqual } from "@effect/vitest/utils"
import { Schema as S, SchemaAST as AST } from "effect"
import * as Util from "../TestUtils.js"

describe("pick", () => {
  it("Refinement", () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number }).pipe(S.filter(() => true))
    const picked = schema.pipe(S.pick("a"))
    Util.assertions.ast.equals(picked, S.Struct({ a: S.NumberFromString }))
  })

  describe("Struct", () => {
    it("required properties", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Struct({ [a]: S.String, b: S.NumberFromString, c: S.Boolean })
      const picked = schema.pipe(S.pick(a, "b"))
      Util.assertions.ast.equals(picked, S.Struct({ [a]: S.String, b: S.NumberFromString }))
    })

    it("optional property (exact)", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.String, { exact: true }),
        b: S.NumberFromString,
        c: S.Boolean
      })
      const picked = schema.pipe(S.pick("a", "b"))
      Util.assertions.ast.equals(
        picked,
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString })
      )
    })
  })

  it("Struct & Record", () => {
    const schema = S.Struct(
      { a: S.NumberFromString, b: S.Number },
      S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
    )
    const picked = schema.pipe(S.pick("a", "c"))
    Util.assertions.ast.equals(picked, S.Struct({ a: S.NumberFromString, c: S.Union(S.String, S.Number) }))
  })

  describe("Record", () => {
    it("Record(string, number)", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      const picked = schema.pipe(S.pick("a", "b"))
      Util.assertions.ast.equals(picked, S.Struct({ a: S.Number, b: S.Number }))
    })

    it("Record(symbol, number)", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number })
      const picked = schema.pipe(S.pick(a, b))
      Util.assertions.ast.equals(picked, S.Struct({ [a]: S.Number, [b]: S.Number }))
    })

    it("Record(string, string) & Record(`a${string}`, number)", async () => {
      const schema = S.Struct(
        {},
        S.Record({ key: S.String, value: S.Union(S.String, S.Number) }),
        S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.Number })
      )
      const picked = schema.pipe(S.pick("a", "b"))
      Util.assertions.ast.equals(picked, S.Struct({ a: S.Number, b: S.Union(S.String, S.Number) }))
    })
  })

  it("Union", () => {
    const A = S.Struct({ a: S.String, b: S.Number })
    const B = S.Struct({ a: S.Number, b: S.String })
    const schema = S.Union(A, B)
    const picked = schema.pipe(S.pick("a"))
    Util.assertions.ast.equals(picked, S.Struct({ a: S.Union(S.String, S.Number) }))
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () =>
        S.Struct({
          a: S.String,
          as: S.Array(schema)
        }).annotations({ identifier: "A" })
    )
    const picked = schema.pipe(S.pick("as"))
    strictEqual(String(picked), "{ readonly as: ReadonlyArray<A> }")
    await Util.assertions.decoding.succeed(picked, { as: [] })
    await Util.assertions.decoding.succeed(picked, { as: [{ a: "a", as: [] }] })

    await Util.assertions.decoding.fail(
      picked,
      { as: [{ as: [] }] },
      `{ readonly as: ReadonlyArray<A> }
└─ ["as"]
   └─ ReadonlyArray<A>
      └─ [0]
         └─ A
            └─ ["a"]
               └─ is missing`
    )
  })

  describe("Transformation", () => {
    it("ComposeTransformation", () => {
      const schema = S.compose(
        S.Struct({ a: S.NumberFromString, b: S.Number }),
        S.Struct({ a: S.Number, b: S.Number })
      )
      const picked = schema.pipe(S.pick("a"))
      Util.assertions.ast.equals(picked, S.compose(S.Struct({ a: S.NumberFromString }), S.Struct({ a: S.Number })))
    })

    describe("TypeLiteralTransformation", () => {
      it("picking keys with associated PropertySignatureTransformations", () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.Number })
        const picked = schema.pipe(S.pick("a"))
        const ast = picked.ast
        assertTrue(AST.isTransformation(ast))
        deepStrictEqual(ast.from, S.Struct({ a: S.optional(S.NumberFromString) }).ast)
        deepStrictEqual(ast.to, S.Struct({ a: S.Number }).ast)
        assertTrue(AST.isTransformation(schema.ast))
        deepStrictEqual(ast.transformation, schema.ast.transformation)
        doesNotThrow(() => picked.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })

      it("picking keys without associated PropertySignatureTransformations", () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.NumberFromString })
        const picked = schema.pipe(S.pick("b"))
        const ast = picked.ast
        assertTrue(AST.isTypeLiteral(ast))
        deepStrictEqual(ast.propertySignatures, [
          new AST.PropertySignature("b", S.NumberFromString.ast, false, true)
        ])
        doesNotThrow(() => picked.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })
    })

    describe("SurrogateAnnotation", () => {
      it("a single Class", () => {
        class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.Number }) {}
        const schema = A
        const picked = schema.pipe(S.pick("a"))
        Util.assertions.ast.equals(picked, S.Struct({ a: S.NumberFromString }))
      })

      it("a union of Classes", () => {
        class A extends S.Class<A>("A")({ a: S.Number, b: S.String }) {}
        class B extends S.Class<B>("B")({ a: S.String, b: S.Number }) {}
        const schema = S.Union(A, B)
        const picked = schema.pipe(S.pick("a"))
        Util.assertions.ast.equals(picked, S.Struct({ a: S.Union(S.Number, S.String) }))
      })
    })
  })

  it("typeSchema(Class)", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A
    const picked = schema.pipe(S.typeSchema, S.pick("b"))
    Util.assertions.ast.equals(picked, S.Struct({ b: S.Number }))
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A
    const picked = schema.pipe(S.pick("b"))
    Util.assertions.ast.equals(picked, S.Struct({ b: S.NumberFromString }))
  })
})
