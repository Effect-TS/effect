import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST/createUnion", () => {
  it("should remove never from members", () => {
    expect(AST.createUnion([AST.neverKeyword, AST.neverKeyword])).toEqual(
      AST.neverKeyword
    )
    expect(AST.createUnion([AST.neverKeyword, AST.stringKeyword])).toEqual(AST.stringKeyword)
    expect(AST.createUnion([AST.stringKeyword, AST.neverKeyword])).toEqual(AST.stringKeyword)
    expect(
      AST.createUnion([
        AST.neverKeyword,
        AST.stringKeyword,
        AST.neverKeyword,
        AST.numberKeyword
      ])
    )
      .toEqual(AST.createUnion([AST.stringKeyword, AST.numberKeyword]))
  })

  it("should unify any with anything", () => {
    expect(S.union(S.literal("a"), S.any).ast).toEqual(S.any.ast)
  })

  it("should unify unknown with anything", () => {
    expect(S.union(S.literal("a"), S.unknown).ast).toEqual(S.unknown.ast)
  })

  it("should unify string literals with string", () => {
    expect(S.union(S.literal("a"), S.string).ast).toEqual(S.string.ast)
  })

  it("should unify number literals with number", () => {
    expect(S.union(S.literal(1), S.number).ast).toEqual(S.number.ast)
  })

  it("should unify boolean literals with boolean", () => {
    expect(S.union(S.literal(true), S.boolean).ast).toEqual(S.boolean.ast)
  })

  it("should unify bigint literals with bigint", () => {
    expect(S.union(S.literal(1n), S.bigintFromSelf).ast).toEqual(S.bigintFromSelf.ast)
  })

  it("should unify symbol literals with symbol", () => {
    expect(S.union(S.uniqueSymbol(Symbol.for("@effect/schema/test/a")), S.symbolFromSelf).ast)
      .toEqual(
        S.symbolFromSelf.ast
      )
  })

  describe("should give precedence to schemas containing more infos", () => {
    it("1 required vs 2 required", () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.string, b: S.number })
      const schema = S.union(a, ab)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [ab.ast, a.ast],
        annotations: {}
      })
    })

    it("1 required vs 2 optional", () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.optional(S.string), b: S.optional(S.number) })
      const schema = S.union(a, ab)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [ab.ast, a.ast],
        annotations: {}
      })
    })

    it("struct({}) should go in last position in a union", () => {
      const a = S.object
      const b = S.struct({})
      const schema = S.union(b, a)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [a.ast, b.ast],
        annotations: {}
      })
    })

    it("object precedence should be low", () => {
      const a = S.tuple()
      const b = S.object
      const schema = S.union(b, a)
      expect(schema.ast).toEqual({
        _tag: "Union",
        types: [a.ast, b.ast],
        annotations: {}
      })
    })
  })
})
