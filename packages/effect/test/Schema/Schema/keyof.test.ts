import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, throws } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("keyof", () => {
  it("should unify string literals with string", () => {
    const schema = S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.String }))
    const keyof = S.keyof(schema)
    deepStrictEqual(keyof.ast, S.String.ast)
  })

  it("should unify symbol literals with symbol", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.Struct({ [a]: S.String }, S.Record({ key: S.SymbolFromSelf, value: S.String }))
    const keyof = S.keyof(schema)
    deepStrictEqual(keyof.ast, S.SymbolFromSelf.ast)
  })

  describe("struct", () => {
    it("string keys", () => {
      const schema = S.Struct({
        a: S.String,
        b: S.Number
      })
      // type K = keyof S.Schema.Type<typeof schema> // "a" | "b"
      const keyOf = S.keyof(schema)
      const is = P.is(keyOf)
      assertTrue(is("a"))
      assertTrue(is("b"))
      assertFalse(is("c"))
    })

    it("symbol keys", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Struct({
        [a]: S.String,
        [b]: S.Number
      })
      const keyOf = S.keyof(schema)
      const is = P.is(keyOf)
      assertTrue(is(a))
      assertTrue(is(b))
      assertFalse(is("a"))
      assertFalse(is("b"))
    })
  })

  describe("record", () => {
    it("string", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      // type K = keyof S.Schema.Type<typeof schema> // string
      deepStrictEqual(AST.keyof(schema.ast), S.String.ast)
    })

    it("symbol", () => {
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number })
      // type K = keyof S.Schema.Type<typeof schema> // symbol
      deepStrictEqual(AST.keyof(schema.ast), S.SymbolFromSelf.ast)
    })

    it("template literal", () => {
      const schema = S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.Number })
      // type K = keyof S.Schema.Type<typeof schema> // `a${string}`
      deepStrictEqual(AST.keyof(schema.ast), S.TemplateLiteral(S.Literal("a"), S.String).ast)
    })
  })

  it("suspend", () => {
    interface Category {
      readonly name: string
      readonly categories: ReadonlyArray<Category>
    }
    const schema: S.Schema<Category> = S.suspend( // intended outer suspend
      () =>
        S.Struct({
          name: S.String,
          categories: S.Array(schema)
        })
    )
    deepStrictEqual(AST.keyof(schema.ast), S.Literal("name", "categories").ast)
  })

  describe("union", () => {
    it("union of structs", () => {
      const schema = S.Union(S.Struct({ a: S.String }), S.Struct({ a: S.Number }))
      // type K = keyof S.Schema.Type<typeof schema> // "a"
      deepStrictEqual(AST.keyof(schema.ast), S.Literal("a").ast)
    })

    it("union of records", () => {
      const schema = S.Union(
        S.Record({ key: S.String, value: S.Number }),
        S.Record({ key: S.String, value: S.Boolean })
      )
      // type K = keyof S.Schema.Type<typeof schema> // string
      deepStrictEqual(AST.keyof(schema.ast), S.String.ast)
    })

    it("union of structs and records", () => {
      const schema = S.Union(
        S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.Number })),
        S.Struct({ a: S.Number }, S.Record({ key: S.String, value: S.Boolean }))
      )
      // type K = keyof S.Schema.Type<typeof schema> // string
      deepStrictEqual(AST.keyof(schema.ast), S.String.ast)
    })
  })

  it("should support Class", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    // type K = keyof S.Schema.Type<typeof A> // "a"
    deepStrictEqual(AST.keyof(A.ast), S.Literal("a").ast)
  })

  it("should throw on unsupported schemas", () => {
    throws(
      () => S.keyof(S.Option(S.String)),
      new Error(`Unsupported schema
schema (Declaration): Option<string>`)
    )
  })
})
