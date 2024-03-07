import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > getWeight", () => {
  it("order", () => {
    const transformation = S.optionFromSelf(S.number)
    const union = S.union(S.struct({ a: S.string }), S.struct({ b: S.number }))
    const refinement = S.array(S.string).pipe(S.filter((as) => as.length === 2))
    const actual = [
      transformation.ast,
      union.ast,
      refinement.ast,
      S.unknown.ast,
      S.any.ast
    ].map(AST.getWeight).sort()
    const expected = [
      S.unknown.ast,
      S.any.ast,
      refinement.ast,
      union.ast,
      transformation.ast
    ].map(AST.getWeight)
    expect(actual).toEqual(expected)
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.string, b: S.number }) {}
    const schema = A.pipe(S.typeSchema)
    expect(AST.getWeight(schema.ast)).toStrictEqual([6, 2, 0])
  })
})
