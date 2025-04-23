import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("AST.Union", () => {
  it("flatten should un-nest union members", () => {
    const asts = AST.flatten([S.Union(S.Literal("a", "b"), S.Literal("c", "d")).ast])
    strictEqual(asts.length, 4)
  })

  it("unify should remove never from members", () => {
    strictEqual(AST.Union.unify([AST.neverKeyword, AST.neverKeyword]), AST.neverKeyword)
    strictEqual(AST.Union.unify([AST.neverKeyword, AST.stringKeyword]), AST.stringKeyword)
    strictEqual(AST.Union.unify([AST.stringKeyword, AST.neverKeyword]), AST.stringKeyword)
    deepStrictEqual(
      AST.Union.unify([
        AST.neverKeyword,
        AST.stringKeyword,
        AST.neverKeyword,
        AST.numberKeyword
      ]),
      AST.Union.unify([AST.stringKeyword, AST.numberKeyword])
    )
  })

  describe("toString", () => {
    it("string | number", () => {
      strictEqual(String(S.Union(S.String, S.Number)), "string | number")
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
      strictEqual(String(schema), "<suspended schema>")
    })

    it("descriptions of nested unions should be preserved", () => {
      const u = S.Union(S.String, S.Number)
      const nested1 = u.annotations({ identifier: "nested1" })
      const nested2 = u.annotations({ identifier: "nested2" })

      strictEqual(String(u), "string | number")
      strictEqual(String(S.Union(nested1, nested1)), "nested1 | nested1")
      strictEqual(String(S.Union(nested1, S.String)), "nested1 | string")
      strictEqual(String(S.Union(nested1, u)), "nested1 | string | number")
      strictEqual(String(S.Union(nested1, nested2)), "nested1 | nested2")
      strictEqual(String(S.Union(nested1, nested2, S.String)), "nested1 | nested2 | string")
    })
  })
})
