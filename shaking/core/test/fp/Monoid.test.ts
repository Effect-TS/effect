import * as assert from "assert"

import { array } from "../../src/Array"
import {
  fold,
  getEndomorphismMonoid,
  getFunctionMonoid,
  getJoinMonoid,
  getMeetMonoid,
  getTupleMonoid,
  monoidAll,
  monoidAny,
  monoidString,
  monoidSum,
  getDualMonoid
} from "../../src/Monoid"
import { boundedNumber } from "../../src/Ord"

describe("Monoid", () => {
  it("getTupleMonoid", () => {
    const M1 = getTupleMonoid(monoidString, monoidSum)
    assert.deepStrictEqual(M1.concat(["a", 1], ["b", 2]), ["ab", 3])
    const M2 = getTupleMonoid(monoidString, monoidSum, monoidAll)
    assert.deepStrictEqual(M2.concat(["a", 1, true], ["b", 2, false]), ["ab", 3, false])
  })

  it("fold", () => {
    assert.deepStrictEqual(fold(monoidSum)([1, 2, 3]), 6)
  })

  it("getFunctionMonoid", () => {
    const getPredicateMonoidAll = getFunctionMonoid(monoidAll)
    const getPredicateMonoidAny = getFunctionMonoid(monoidAny)

    const isLessThan10 = (n: number) => n <= 10
    const isEven = (n: number) => n % 2 === 0

    assert.deepStrictEqual(
      array.filter(
        [1, 2, 3, 40],
        fold(getPredicateMonoidAll<number>())([isLessThan10, isEven])
      ),
      [2]
    )
    assert.deepStrictEqual(
      array.filter(
        [1, 2, 3, 40, 41],
        fold(getPredicateMonoidAny<number>())([isLessThan10, isEven])
      ),
      [1, 2, 3, 40]
    )
  })

  it("getEndomorphismMonoid", () => {
    const M = getEndomorphismMonoid<number>()
    const double = (n: number) => n * 2
    const inc = (n: number) => n + 1
    const f = M.concat(double, inc)
    assert.deepStrictEqual(f(3), 8)
  })

  it("getMeetMonoid", () => {
    const M = getMeetMonoid(boundedNumber)
    assert.deepStrictEqual(fold(M)([]), +Infinity)
    assert.deepStrictEqual(fold(M)([1]), 1)
    assert.deepStrictEqual(fold(M)([1, -1]), -1)
  })

  it("getJoinMonoid", () => {
    const M = getJoinMonoid(boundedNumber)
    assert.deepStrictEqual(fold(M)([]), -Infinity)
    assert.deepStrictEqual(fold(M)([1]), 1)
    assert.deepStrictEqual(fold(M)([1, -1]), 1)
  })

  it("getDualMonoid", () => {
    const M = getDualMonoid(monoidString)
    assert.deepStrictEqual(M.concat("a", "b"), "ba")
    assert.deepStrictEqual(M.concat("a", M.empty), "a")
    assert.deepStrictEqual(M.concat(M.empty, "a"), "a")
  })
})
