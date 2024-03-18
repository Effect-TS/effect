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

  it("description for nested unions", () => {
    const u = S.union(S.string, S.number)
    const nested1 = u.annotations({ identifier: "nested1" })
    const nested2 = u.annotations({ identifier: "nested2" })

    expect(String(u)).toStrictEqual("string | number")
    expect(String(S.union(nested1, nested1))).toStrictEqual("nested1 | nested1")
    expect(String(S.union(nested1, S.string))).toStrictEqual("nested1 | string")
    expect(String(S.union(nested1, u))).toStrictEqual("nested1 | string | number")
    expect(String(S.union(nested1, nested2))).toStrictEqual("nested1 | nested2")
    expect(String(S.union(nested1, nested2, S.string))).toStrictEqual("nested1 | nested2 | string")
  })
})
