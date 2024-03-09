import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST.Union", () => {
  it("should remove never from members", () => {
    expect(AST.Union.make([AST.neverKeyword, AST.neverKeyword])).toEqual(
      AST.neverKeyword
    )
    expect(AST.Union.make([AST.neverKeyword, AST.stringKeyword])).toEqual(AST.stringKeyword)
    expect(AST.Union.make([AST.stringKeyword, AST.neverKeyword])).toEqual(AST.stringKeyword)
    expect(
      AST.Union.make([
        AST.neverKeyword,
        AST.stringKeyword,
        AST.neverKeyword,
        AST.numberKeyword
      ])
    ).toEqual(AST.Union.make([AST.stringKeyword, AST.numberKeyword]))
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
      const ab = S.struct({
        a: S.optional(S.string, { exact: true }),
        b: S.optional(S.number, { exact: true })
      })
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
  })

  it("toString() should unify", () => {
    const member = S.struct({ a: S.string })
    const schema = S.union(member, member)
    expect(String(schema)).toStrictEqual("{ a: string }")
  })

  it("toString() should support suspended schemas", () => {
    interface A {
      readonly a?: null | A | undefined
    }
    const schema: S.Schema<A> = S.partial(
      S.suspend(
        () =>
          S.struct({
            a: S.union(S.null, schema)
          })
      )
    )
    expect(String(schema)).toStrictEqual("<suspended schema>")
  })

  describe("default description for nested unions", () => {
    it("should set a default description if there is at least one nested union with annotations", () => {
      const u = S.union(S.string, S.number)
      const nested1 = u.annotations({ identifier: "nested1" })
      const nested2 = u.annotations({ identifier: "nested2" })

      expect(String(u)).toStrictEqual("string | number")
      expect(String(S.union(nested1, nested1))).toStrictEqual("nested1")
      expect(String(S.union(nested1, S.string))).toStrictEqual("nested1 | ...")
      expect(String(S.union(nested1, u))).toStrictEqual("nested1 | ...")
      expect(String(S.union(nested1, nested2))).toStrictEqual("nested1 | nested2")
      expect(String(S.union(nested1, nested2, S.string))).toStrictEqual("nested1 | nested2 | ...")
    })
  })
})
