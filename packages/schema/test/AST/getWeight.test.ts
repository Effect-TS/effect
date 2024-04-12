import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > getWeight", () => {
  it("order", () => {
    const transformation = S.OptionFromSelf(S.Number)
    const union = S.Union(S.Struct({ a: S.String }), S.Struct({ b: S.Number }))
    const refinement = S.Array(S.String).pipe(S.filter((as) => as.length === 2))
    const actual = [
      transformation.ast,
      union.ast,
      refinement.ast,
      S.Unknown.ast,
      S.Any.ast
    ].map(AST.getWeight).sort()
    const expected = [
      S.Unknown.ast,
      S.Any.ast,
      refinement.ast,
      union.ast,
      transformation.ast
    ].map(AST.getWeight)
    expect(actual).toEqual(expected)
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.Number }) {}
    const schema = A.pipe(S.TypeSchema)
    expect(AST.getWeight(schema.ast)).toStrictEqual([6, 2, 0])
  })
})
