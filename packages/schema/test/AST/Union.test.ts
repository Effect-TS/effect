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
    )
      .toEqual(AST.Union.make([AST.stringKeyword, AST.numberKeyword]))
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
})
