import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > keyof", () => {
  it("should unify string literals with string", () => {
    const schema = S.Struct({ a: S.String }, S.Record(S.String, S.String))
    const keyof = S.keyof(schema)
    expect(keyof.ast).toEqual(S.String.ast)
  })

  it("should unify symbol literals with symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.Struct({ [a]: S.String }, S.Record(S.SymbolFromSelf, S.String))
    const keyof = S.keyof(schema)
    expect(keyof.ast).toEqual(S.SymbolFromSelf.ast)
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
      expect(is("a")).toEqual(true)
      expect(is("b")).toEqual(true)
      expect(is("c")).toEqual(false)
    })

    it("symbol keys", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.Struct({
        [a]: S.String,
        [b]: S.Number
      })
      const keyOf = S.keyof(schema)
      const is = P.is(keyOf)
      expect(is(a)).toEqual(true)
      expect(is(b)).toEqual(true)
      expect(is("a")).toEqual(false)
      expect(is("b")).toEqual(false)
    })
  })

  describe("record", () => {
    it("string", () => {
      const schema = S.Record(S.String, S.Number)
      // type K = keyof S.Schema.Type<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.String.ast)
    })

    it("symbol", () => {
      const schema = S.Record(S.SymbolFromSelf, S.Number)
      // type K = keyof S.Schema.Type<typeof schema> // symbol
      expect(AST.keyof(schema.ast)).toEqual(S.SymbolFromSelf.ast)
    })

    it("template literal", () => {
      const schema = S.Record(S.TemplateLiteral(S.Literal("a"), S.String), S.Number)
      // type K = keyof S.Schema.Type<typeof schema> // `a${string}`
      expect(AST.keyof(schema.ast)).toEqual(S.TemplateLiteral(S.Literal("a"), S.String).ast)
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
    expect(AST.keyof(schema.ast)).toEqual(S.Literal("name", "categories").ast)
  })

  describe("union", () => {
    it("union of structs", () => {
      const schema = S.Union(S.Struct({ a: S.String }), S.Struct({ a: S.Number }))
      // type K = keyof S.Schema.Type<typeof schema> // "a"
      expect(AST.keyof(schema.ast)).toEqual(S.Literal("a").ast)
    })

    it("union of records", () => {
      const schema = S.Union(S.Record(S.String, S.Number), S.Record(S.String, S.Boolean))
      // type K = keyof S.Schema.Type<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.String.ast)
    })

    it("union of structs and records", () => {
      const schema = S.Union(
        S.Struct({ a: S.String }, S.Record(S.String, S.Number)),
        S.Struct({ a: S.Number }, S.Record(S.String, S.Boolean))
      )
      // type K = keyof S.Schema.Type<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.String.ast)
    })
  })

  it("should support Class", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    // type K = keyof S.Schema.Type<typeof A> // "a"
    expect(AST.keyof(A.ast)).toEqual(S.Literal("a").ast)
  })

  it("should throw on unsupported schemas", () => {
    expect(() => S.keyof(S.Option(S.String))).toThrow(
      new Error("KeyOf: unsupported schema (Option<string>)")
    )
  })
})
