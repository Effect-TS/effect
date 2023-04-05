import { pipe } from "@effect/data/Function"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

it("_getWeight/transform/ should return the weight of type", () => {
  expect(AST._getWeight(S.optionFromSelf(S.number).ast)).toEqual(3)
})

it("_getWeight/union/ should return the sum of the members weight", () => {
  expect(AST._getWeight(S.union(S.struct({ a: S.string }), S.struct({ b: S.number })).ast))
    .toEqual(2)
})

it("_getWeight/refinement/ should return the weight of the from type", () => {
  expect(AST._getWeight(pipe(S.array(S.string), S.filter((as) => as.length === 2)).ast)).toEqual(
    1
  )
})

it("_getCardinality/ UnknownKeyword", () => {
  expect(AST._getWeight(S.unknown.ast)).toEqual(-2)
})

it("_getCardinality/ AnyKeyword", () => {
  expect(AST._getWeight(S.any.ast)).toEqual(-2)
})
