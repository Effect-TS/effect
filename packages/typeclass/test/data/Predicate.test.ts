import * as PredicatenIstances from "@effect/typeclass/data/Predicate"
import { describe, expect, it } from "@effect/vitest"
import { constFalse, constTrue } from "effect/Function"
import type * as Predicate from "effect/Predicate"
import * as Util from "../util.js"

describe.concurrent("Option", () => {
  const isPositive: Predicate.Predicate<number> = (n) => n > 0
  const isNegative: Predicate.Predicate<number> = (n) => n < 0
  const isLessThan2: Predicate.Predicate<number> = (n) => n < 2

  it("SemiProduct.productMany", () => {
    const productMany = PredicatenIstances.SemiProduct.productMany
    const p = productMany(isPositive, [isNegative])
    Util.deepStrictEqual(p([1, -1]), true)
    Util.deepStrictEqual(p([1, 1]), false)
    Util.deepStrictEqual(p([-1, -1]), false)
    Util.deepStrictEqual(p([-1, 1]), false)
  })

  it("Product.productAll", () => {
    const p = PredicatenIstances.Product.productAll([isPositive, isNegative])
    Util.deepStrictEqual(p([1]), true)
    Util.deepStrictEqual(p([1, -1]), true)
    Util.deepStrictEqual(p([1, 1]), false)
    Util.deepStrictEqual(p([-1, -1]), false)
    Util.deepStrictEqual(p([-1, 1]), false)
  })

  it("getSemigroupSome", () => {
    const S = PredicatenIstances.getSemigroupSome<number>()
    const p1 = S.combine(isPositive, isNegative)
    Util.deepStrictEqual(p1(0), false)
    Util.deepStrictEqual(p1(-1), true)
    Util.deepStrictEqual(p1(1), true)
    const p2 = S.combineMany(isPositive, [isNegative])
    Util.deepStrictEqual(p2(0), false)
    Util.deepStrictEqual(p2(-1), true)
    Util.deepStrictEqual(p2(1), true)
  })

  it("getMonoidSome", () => {
    const M = PredicatenIstances.getMonoidSome<number>()
    const predicate = M.combine(isPositive, M.empty)
    Util.deepStrictEqual(predicate(0), isPositive(0))
    Util.deepStrictEqual(predicate(-1), isPositive(-1))
    Util.deepStrictEqual(predicate(1), isPositive(1))
  })

  it("getSemigroupEvery", () => {
    const S = PredicatenIstances.getSemigroupEvery<number>()
    const p1 = S.combine(isPositive, isLessThan2)
    Util.deepStrictEqual(p1(0), false)
    Util.deepStrictEqual(p1(-2), false)
    Util.deepStrictEqual(p1(1), true)
    const p2 = S.combineMany(isPositive, [isLessThan2])
    Util.deepStrictEqual(p2(0), false)
    Util.deepStrictEqual(p2(-2), false)
    Util.deepStrictEqual(p2(1), true)
    const p3 = S.combineMany(isLessThan2, [isPositive])
    Util.deepStrictEqual(p3(0), false)
    Util.deepStrictEqual(p3(-2), false)
    Util.deepStrictEqual(p3(1), true)
  })

  it("getMonoidEvery", () => {
    const M = PredicatenIstances.getMonoidEvery<number>()
    const predicate = M.combine(isPositive, M.empty)
    Util.deepStrictEqual(predicate(0), isPositive(0))
    Util.deepStrictEqual(predicate(-1), isPositive(-1))
    Util.deepStrictEqual(predicate(1), isPositive(1))
  })

  it("getSemigroupXor", () => {
    const S = PredicatenIstances.getSemigroupXor<null>()
    expect(S.combine(constTrue, constTrue)(null)).toBeFalsy() // true xor true = false
    expect(S.combine(constTrue, constFalse)(null)).toBeTruthy() // true xor false = true
    expect(S.combine(constFalse, constTrue)(null)).toBeTruthy() // true xor true = true
    expect(S.combine(constFalse, constFalse)(null)).toBeFalsy() // true xor false = false
  })

  it("getMonoidXor", () => {
    const M = PredicatenIstances.getMonoidXor<null>()
    expect(M.combine(constTrue, constTrue)(null)).toBeFalsy() // true xor true = false
    expect(M.combine(constTrue, constFalse)(null)).toBeTruthy() // true xor false = true
    expect(M.combine(constFalse, constTrue)(null)).toBeTruthy() // true xor true = true
    expect(M.combine(constFalse, constFalse)(null)).toBeFalsy() // true xor false = false
  })

  it("getSemigroupEqv", () => {
    const S = PredicatenIstances.getSemigroupEqv<null>()
    expect(S.combine(constTrue, constTrue)(null)).toBeTruthy() // true eqv true = true
    expect(S.combine(constTrue, constFalse)(null)).toBeFalsy() // true eqv false = false
    expect(S.combine(constFalse, constTrue)(null)).toBeFalsy() // true eqv true = true
    expect(S.combine(constFalse, constFalse)(null)).toBeTruthy() // true eqv false = false
  })

  it("getMonoidEqv", () => {
    const M = PredicatenIstances.getMonoidEqv<null>()
    expect(M.combine(constTrue, constTrue)(null)).toBeTruthy() // true eqv true = true
    expect(M.combine(constTrue, constFalse)(null)).toBeFalsy() // true eqv false = false
    expect(M.combine(constFalse, constTrue)(null)).toBeFalsy() // true eqv true = true
    expect(M.combine(constFalse, constFalse)(null)).toBeTruthy() // true eqv false = false
  })
})
