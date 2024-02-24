import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > keyof", () => {
  describe("struct", () => {
    it("string keys", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      // type K = keyof S.Schema.To<typeof schema> // "a" | "b"
      const keyOf = S.keyof(schema)
      const is = P.is(keyOf)
      expect(is("a")).toEqual(true)
      expect(is("b")).toEqual(true)
      expect(is("c")).toEqual(false)
    })

    it("symbol keys", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.struct({
        [a]: S.string,
        [b]: S.number
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
      const schema = S.record(S.string, S.number)
      // type K = keyof S.Schema.To<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.string.ast)
    })

    it("symbol", () => {
      const schema = S.record(S.symbolFromSelf, S.number)
      // type K = keyof S.Schema.To<typeof schema> // symbol
      expect(AST.keyof(schema.ast)).toEqual(S.symbolFromSelf.ast)
    })

    it("template literal", () => {
      const schema = S.record(S.templateLiteral(S.literal("a"), S.string), S.number)
      // type K = keyof S.Schema.To<typeof schema> // `a${string}`
      expect(AST.keyof(schema.ast)).toEqual(S.templateLiteral(S.literal("a"), S.string).ast)
    })
  })

  it("should unify string literals with string", () => {
    const schema = S.struct({ a: S.string }).pipe(S.extend(S.record(S.string, S.string)))
    expect(AST.keyof(schema.ast)).toEqual(S.string.ast)
  })

  it("should unify symbol literals with symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string }).pipe(S.extend(S.record(S.symbolFromSelf, S.string)))
    expect(AST.keyof(schema.ast)).toEqual(S.symbolFromSelf.ast)
  })

  it("suspend", () => {
    interface Category {
      readonly name: string
      readonly categories: ReadonlyArray<Category>
    }
    const schema: S.Schema<Category> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          name: S.string,
          categories: S.array(schema)
        })
    )
    expect(AST.keyof(schema.ast)).toEqual(S.literal("name", "categories").ast)
  })

  describe("union", () => {
    it("union of structs", () => {
      const schema = S.union(S.struct({ a: S.string }), S.struct({ a: S.number }))
      // type K = keyof S.Schema.To<typeof schema> // "a"
      expect(AST.keyof(schema.ast)).toEqual(S.literal("a").ast)
    })

    it("union of records", () => {
      const schema = S.union(S.record(S.string, S.number), S.record(S.string, S.boolean))
      // type K = keyof S.Schema.To<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.string.ast)
    })

    it("union of structs and records", () => {
      const schema = S.union(
        S.struct({ a: S.string }).pipe(S.extend(S.record(S.string, S.number))),
        S.struct({ a: S.number }).pipe(S.extend(S.record(S.string, S.boolean)))
      )
      // type K = keyof S.Schema.To<typeof schema> // string
      expect(AST.keyof(schema.ast)).toEqual(S.string.ast)
    })
  })

  it("should support Class", () => {
    class A extends S.Class<A>()({ a: S.string }) {}
    // type K = keyof S.Schema.To<typeof A> // "a"
    expect(AST.keyof(A.ast)).toEqual(S.literal("a").ast)
  })

  it("should throw on unsupported schemas", () => {
    expect(() => S.keyof(S.option(S.string))).toThrow(
      new Error("keyof: unsupported schema (Option<string>)")
    )
  })
})
