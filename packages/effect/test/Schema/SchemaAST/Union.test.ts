import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("AST.Union", () => {
  it("flatten should un-nest union members", () => {
    const asts = AST.flatten([S.Union(S.Literal("a", "b"), S.Literal("c", "d")).ast])
    expect(asts.length).toBe(4)
  })

  it("unify should remove never from members", () => {
    expect(AST.Union.unify([AST.neverKeyword, AST.neverKeyword])).toEqual(
      AST.neverKeyword
    )
    expect(AST.Union.unify([AST.neverKeyword, AST.stringKeyword])).toEqual(AST.stringKeyword)
    expect(AST.Union.unify([AST.stringKeyword, AST.neverKeyword])).toEqual(AST.stringKeyword)
    expect(
      AST.Union.unify([
        AST.neverKeyword,
        AST.stringKeyword,
        AST.neverKeyword,
        AST.numberKeyword
      ])
    ).toEqual(AST.Union.unify([AST.stringKeyword, AST.numberKeyword]))
  })

  describe("toString", () => {
    it("string | number", () => {
      expect(String(S.Union(S.String, S.Number))).toEqual("string | number")
    })

    it("should support suspended schemas", () => {
      interface A {
        readonly a?: null | A | undefined
      }
      // intended outer suspend
      const schema: S.Schema<A> = S.partial(
        S.suspend(
          () =>
            S.Struct({
              a: S.Union(S.Null, schema)
            })
        )
      )
      expect(String(schema)).toStrictEqual("<suspended schema>")
    })

    it("descriptions of nested unions should be preserved", () => {
      const u = S.Union(S.String, S.Number)
      const nested1 = u.annotations({ identifier: "nested1" })
      const nested2 = u.annotations({ identifier: "nested2" })

      expect(String(u)).toStrictEqual("string | number")
      expect(String(S.Union(nested1, nested1))).toStrictEqual("nested1 | nested1")
      expect(String(S.Union(nested1, S.String))).toStrictEqual("nested1 | string")
      expect(String(S.Union(nested1, u))).toStrictEqual("nested1 | string | number")
      expect(String(S.Union(nested1, nested2))).toStrictEqual("nested1 | nested2")
      expect(String(S.Union(nested1, nested2, S.String))).toStrictEqual("nested1 | nested2 | string")
    })
  })
})
