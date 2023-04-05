import { pipe } from "@effect/data/Function"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

it("_getCardinality/ NeverKeyword", () => {
  expect(AST._getCardinality(AST.neverKeyword)).toEqual(0)
})

it("_getCardinality/ ObjectKeyword", () => {
  expect(AST._getCardinality(AST.objectKeyword)).toEqual(5)
})

it("_getCardinality/ Refinement", () => {
  expect(AST._getCardinality(pipe(S.string, S.nonEmpty()).ast)).toEqual(4)
})

it("_getCardinality/ UnknownKeyword", () => {
  expect(AST._getCardinality(S.unknown.ast)).toEqual(6)
})

it("_getCardinality/ AnyKeyword", () => {
  expect(AST._getCardinality(S.any.ast)).toEqual(6)
})
