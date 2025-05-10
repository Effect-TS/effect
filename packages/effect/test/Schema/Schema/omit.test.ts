import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, doesNotThrow, strictEqual } from "@effect/vitest/utils"
import { Schema as S, SchemaAST as AST } from "effect"
import * as Util from "../TestUtils.js"

describe("omit", () => {
  describe("omit specific tests", () => {
    it("Struct & Record", () => {
      const record = S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
      const schema = S.Struct(
        { a: S.NumberFromString, b: S.Number },
        record
      )
      const omitted = schema.pipe(S.omit("b"))
      Util.assertions.ast.equals(omitted, record)
    })

    describe("Record", () => {
      it("Record(string, number)", () => {
        const schema = S.Record({ key: S.String, value: S.Number })
        const omitted = schema.pipe(S.omit("a"))
        Util.assertions.ast.equals(omitted, schema)
      })

      it("Record(symbol, number)", () => {
        const a = Symbol.for("effect/Schema/test/a")
        const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number })
        const omitted = schema.pipe(S.omit(a))
        Util.assertions.ast.equals(omitted, schema)
      })

      it("Record(string, string) & Record(`a${string}`, number)", async () => {
        const schema = S.Struct(
          {},
          S.Record({ key: S.String, value: S.Union(S.String, S.Number) }),
          S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.Number })
        )
        const omitted = schema.pipe(S.omit("a"))
        Util.assertions.ast.equals(omitted, S.Record({ key: S.String, value: S.Union(S.String, S.Number) }))
      })
    })

    it("fromKey", () => {
      const schema = S.Struct({
        a: S.String,
        b: S.propertySignature(S.Number).pipe(S.fromKey("c"))
      })
      const omitted = schema.pipe(S.omit("a"))
      const expected = S.Struct({
        c: S.Number
      }).pipe(S.rename({ c: "b" }))
      Util.assertions.ast.equals(omitted, expected)
    })

    it("rename", () => {
      const schema = S.Struct({
        a: S.String,
        c: S.Number
      }).pipe(S.rename({ c: "b" }))
      const omitted = schema.pipe(S.omit("a"))
      const expected = S.Struct({
        c: S.Number
      }).pipe(S.rename({ c: "b" }))
      Util.assertions.ast.equals(omitted, expected)
    })
  })

  it("Refinement", () => {
    const schema = S.Struct({ a: S.NumberFromString, b: S.Number }).pipe(S.filter(() => true))
    const omitted = schema.pipe(S.omit("b"))
    Util.assertions.ast.equals(omitted, S.Struct({ a: S.NumberFromString }))
  })

  describe("Struct", () => {
    it("required properties", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Struct({ [a]: S.String, b: S.NumberFromString, c: S.Boolean })
      const omitted = schema.pipe(S.omit("c"))
      Util.assertions.ast.equals(omitted, S.Struct({ [a]: S.String, b: S.NumberFromString }))
    })

    it("optional property (exact)", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.String, { exact: true }),
        b: S.NumberFromString,
        c: S.Boolean
      })
      const omitted = schema.pipe(S.omit("c"))
      Util.assertions.ast.equals(
        omitted,
        S.Struct({ a: S.optionalWith(S.String, { exact: true }), b: S.NumberFromString })
      )
    })
  })

  it("Union", () => {
    const A = S.Struct({ a: S.String, b: S.Number })
    const B = S.Struct({ a: S.Number, b: S.String })
    const schema = S.Union(A, B)
    const omitted = schema.pipe(S.omit("b"))
    Util.assertions.ast.equals(omitted, S.Struct({ a: S.Union(S.String, S.Number) }))
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
    const omitted = schema.pipe(S.omit("a"))
    strictEqual(String(omitted), "{ readonly as: ReadonlyArray<A> }")
    await Util.assertions.decoding.succeed(omitted, { as: [] })
    await Util.assertions.decoding.succeed(omitted, { as: [{ a: "a", as: [] }] })

    await Util.assertions.decoding.fail(
      omitted,
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
      const omitted = schema.pipe(S.omit("b"))
      Util.assertions.ast.equals(omitted, S.compose(S.Struct({ a: S.NumberFromString }), S.Struct({ a: S.Number })))
    })

    describe("TypeLiteralTransformation", () => {
      it("omitting keys without associated PropertySignatureTransformations", () => {
        const schema = S.Struct({ a: S.optionalWith(S.NumberFromString, { default: () => 0 }), b: S.Number })
        const omitted = schema.pipe(S.omit("b"))
        const ast = omitted.ast
        assertTrue(AST.isTransformation(ast))
        deepStrictEqual(ast.from, S.Struct({ a: S.optional(S.NumberFromString) }).ast)
        deepStrictEqual(ast.to, S.Struct({ a: S.Number }).ast)
        assertTrue(AST.isTransformation(schema.ast))
        deepStrictEqual(ast.transformation, schema.ast.transformation)
        doesNotThrow(() => omitted.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })

      it("omitting keys with associated PropertySignatureTransformations", () => {
        const schema = S.Struct({
          a: S.optionalWith(S.NumberFromString, { default: () => 0 }),
          b: S.NumberFromString
        })
        const omitted = schema.pipe(S.omit("a"))
        const ast = omitted.ast
        assertTrue(AST.isTypeLiteral(ast))
        deepStrictEqual(ast.propertySignatures, [
          new AST.PropertySignature("b", S.NumberFromString.ast, false, true)
        ])
        doesNotThrow(() => omitted.pipe(S.extend(S.Struct({ c: S.Boolean }))))
      })
    })

    describe("SurrogateAnnotation", () => {
      it("a single Class", () => {
        class A extends S.Class<A>("A")({ a: S.NumberFromString, b: S.Number }) {}
        const schema = A
        const omitted = schema.pipe(S.omit("b"))
        Util.assertions.ast.equals(omitted, S.Struct({ a: S.NumberFromString }))
      })

      it("a union of Classes", () => {
        class A extends S.Class<A>("A")({ a: S.Number, b: S.String }) {}
        class B extends S.Class<B>("B")({ a: S.String, b: S.Number }) {}
        const schema = S.Union(A, B)
        const omitted = schema.pipe(S.omit("b"))
        Util.assertions.ast.equals(omitted, S.Struct({ a: S.Union(S.Number, S.String) }))
      })
    })
  })

  it("typeSchema(Class)", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A
    const omitted = schema.pipe(S.typeSchema, S.omit("a"))
    Util.assertions.ast.equals(omitted, S.Struct({ b: S.Number }))
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A
    const omitted = schema.pipe(S.omit("a"))
    Util.assertions.ast.equals(omitted, S.Struct({ b: S.NumberFromString }))
  })
})
