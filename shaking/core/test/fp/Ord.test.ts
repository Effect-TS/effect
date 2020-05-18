import * as assert from "assert"

import { fold } from "../../src/Monoid"
import {
  ord,
  between,
  clamp,
  getDualOrd,
  getMonoid,
  ordDate,
  ordNumber,
  ordString,
  leq,
  geq,
  fromCompare,
  getTupleOrd,
  ordBoolean
} from "../../src/Ord"
import { sort } from "../../src/Readonly/Array"

describe("Ord", () => {
  it("getTupleOrd", () => {
    const O = getTupleOrd(ordString, ordNumber, ordBoolean)
    assert.deepStrictEqual(O.compare(["a", 1, true], ["b", 2, true]), -1)
    assert.deepStrictEqual(O.compare(["a", 1, true], ["a", 2, true]), -1)
    assert.deepStrictEqual(O.compare(["a", 1, true], ["a", 1, false]), 1)
  })

  it("getMonoid", () => {
    type T = readonly [number, string]
    const tuples: ReadonlyArray<T> = [
      [2, "c"],
      [1, "b"],
      [2, "a"],
      [1, "c"]
    ]
    const M = getMonoid<T>()
    const sortByFst = ord.contramap(ordNumber, (x: T) => x[0])
    const sortBySnd = ord.contramap(ordString, (x: T) => x[1])
    //                  v-- left unit
    const O1 = fold(M)([M.empty, sortByFst, sortBySnd])
    assert.deepStrictEqual(sort(O1)(tuples), [
      [1, "b"],
      [1, "c"],
      [2, "a"],
      [2, "c"]
    ])
    //                           right unit --v
    const O2 = fold(M)([sortBySnd, sortByFst, M.empty])
    assert.deepStrictEqual(sort(O2)(tuples), [
      [2, "a"],
      [1, "b"],
      [1, "c"],
      [2, "c"]
    ])
  })

  it("ordNumber", () => {
    assert.deepStrictEqual(ordNumber.compare(1, 2), -1)
    assert.deepStrictEqual(ordNumber.compare(2, 1), 1)
    assert.deepStrictEqual(ordNumber.compare(2, 2), 0)
  })

  it("ordBoolean", () => {
    assert.deepStrictEqual(ordNumber.compare(1, 2), -1)
    assert.deepStrictEqual(ordNumber.compare(2, 1), 1)
    assert.deepStrictEqual(ordNumber.compare(2, 2), 0)
  })

  it("clamp", () => {
    const clampNumber = clamp(ordNumber)
    assert.deepStrictEqual(clampNumber(1, 10)(2), 2)
    assert.deepStrictEqual(clampNumber(1, 10)(10), 10)
    assert.deepStrictEqual(clampNumber(1, 10)(20), 10)
    assert.deepStrictEqual(clampNumber(1, 10)(1), 1)
    assert.deepStrictEqual(clampNumber(1, 10)(-10), 1)
  })

  it("between", () => {
    const betweenNumber = between(ordNumber)
    assert.deepStrictEqual(betweenNumber(1, 10)(2), true)
    assert.deepStrictEqual(betweenNumber(1, 10)(10), true)
    assert.deepStrictEqual(betweenNumber(1, 10)(20), false)
    assert.deepStrictEqual(betweenNumber(1, 10)(1), true)
    assert.deepStrictEqual(betweenNumber(1, 10)(-10), false)
  })

  it("getDualOrd", () => {
    const O = getDualOrd(ordNumber)
    assert.deepStrictEqual(O.compare(1, 2), 1)
    assert.deepStrictEqual(O.compare(2, 1), -1)
    assert.deepStrictEqual(O.compare(2, 2), 0)
  })

  it("ordDate", () => {
    assert.deepStrictEqual(ordDate.compare(new Date(0), new Date(0)), 0)
    assert.deepStrictEqual(ordDate.compare(new Date(0), new Date(1)), -1)
    assert.deepStrictEqual(ordDate.compare(new Date(1), new Date(0)), 1)
  })

  it("leq", () => {
    assert.deepStrictEqual(leq(ordNumber)(0, 1), true)
    assert.deepStrictEqual(leq(ordNumber)(1, 1), true)
    assert.deepStrictEqual(leq(ordNumber)(2, 1), false)
  })

  it("greaterThanOrEq", () => {
    assert.deepStrictEqual(geq(ordNumber)(0, 1), false)
    assert.deepStrictEqual(geq(ordNumber)(1, 1), true)
    assert.deepStrictEqual(geq(ordNumber)(2, 1), true)
  })

  it("fromCompare", () => {
    const O1 = fromCompare(ordNumber.compare)
    assert.deepStrictEqual(O1.equals(0, 1), false)
    assert.deepStrictEqual(O1.equals(1, 1), true)
    interface A {
      readonly x: number
    }
    let nbCall = 0
    const O2 = fromCompare<A>((a, b) => {
      nbCall += 1
      return ordNumber.compare(a.x, b.x)
    })
    const a1 = { x: 1 }
    const a2 = { x: 1 }
    assert.deepStrictEqual(O2.equals(a1, a1), true)
    assert.deepStrictEqual(nbCall, 0)
    assert.deepStrictEqual(O2.equals(a1, a2), true)
    assert.deepStrictEqual(nbCall, 1)
    assert.deepStrictEqual(O2.compare(a1, a1), 0)
    assert.deepStrictEqual(nbCall, 1)
    assert.deepStrictEqual(O2.compare(a1, a2), 0)
    assert.deepStrictEqual(nbCall, 2)
  })
})
