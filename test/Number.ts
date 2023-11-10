import { deepStrictEqual } from "effect-test/util"
import { pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as Option from "effect/Option"
import { assert, describe, expect, it } from "vitest"

describe.concurrent("Number", () => {
  it("isNumber", () => {
    expect(Number.isNumber(1)).toEqual(true)
    expect(Number.isNumber("a")).toEqual(false)
    expect(Number.isNumber(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(1, Number.sum(2)), 3)
  })

  it("multiply", () => {
    deepStrictEqual(pipe(2, Number.multiply(3)), 6)
  })

  it("subtract", () => {
    deepStrictEqual(pipe(3, Number.subtract(1)), 2)
  })

  it("divide", () => {
    deepStrictEqual(pipe(6, Number.divide(2)), Option.some(3))
    deepStrictEqual(pipe(6, Number.divide(0)), Option.none())
  })

  it("unsafeDivide", () => {
    deepStrictEqual(pipe(6, Number.unsafeDivide(2)), 3)
  })

  it("decrement", () => {
    deepStrictEqual(Number.decrement(2), 1)
  })

  it("Equivalence", () => {
    expect(Number.Equivalence(1, 1)).toBe(true)
    expect(Number.Equivalence(1, 2)).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(Number.Order(1, 2), -1)
    deepStrictEqual(Number.Order(2, 1), 1)
    deepStrictEqual(Number.Order(2, 2), 0)
  })

  it("sign", () => {
    deepStrictEqual(Number.sign(0), 0)
    deepStrictEqual(Number.sign(0.0), 0)
    deepStrictEqual(Number.sign(-0.1), -1)
    deepStrictEqual(Number.sign(-10), -1)
    deepStrictEqual(Number.sign(10), 1)
    deepStrictEqual(Number.sign(0.1), 1)
  })

  it("remainder", () => {
    assert.deepStrictEqual(Number.remainder(2, 2), 0)
    assert.deepStrictEqual(Number.remainder(3, 2), 1)
    assert.deepStrictEqual(Number.remainder(4, 2), 0)
    assert.deepStrictEqual(Number.remainder(2.5, 2), 0.5)
    assert.deepStrictEqual(Number.remainder(-2, 2), -0)
    assert.deepStrictEqual(Number.remainder(-3, 2), -1)
    assert.deepStrictEqual(Number.remainder(-4, 2), -0)
    assert.deepStrictEqual(Number.remainder(-2.8, -.2), -0)
    assert.deepStrictEqual(Number.remainder(-2, -.2), -0)
    assert.deepStrictEqual(Number.remainder(-1.5, -.2), -0.1)
    assert.deepStrictEqual(Number.remainder(0, -.2), 0)
    assert.deepStrictEqual(Number.remainder(1, -.2), 0)
    assert.deepStrictEqual(Number.remainder(2.6, -.2), 0)
    assert.deepStrictEqual(Number.remainder(3.1, -.2), 0.1)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(Number.lessThan(2, 3), true)
    assert.deepStrictEqual(Number.lessThan(3, 3), false)
    assert.deepStrictEqual(Number.lessThan(4, 3), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(Number.lessThanOrEqualTo(2, 3), true)
    assert.deepStrictEqual(Number.lessThanOrEqualTo(3, 3), true)
    assert.deepStrictEqual(Number.lessThanOrEqualTo(4, 3), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(Number.greaterThan(2, 3), false)
    assert.deepStrictEqual(Number.greaterThan(3, 3), false)
    assert.deepStrictEqual(Number.greaterThan(4, 3), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(Number.greaterThanOrEqualTo(2, 3), false)
    assert.deepStrictEqual(Number.greaterThanOrEqualTo(3, 3), true)
    assert.deepStrictEqual(Number.greaterThanOrEqualTo(4, 3), true)
  })

  it("between", () => {
    assert.deepStrictEqual(Number.between({ minimum: 0, maximum: 5 })(3), true)
    assert.deepStrictEqual(Number.between({ minimum: 0, maximum: 5 })(-1), false)
    assert.deepStrictEqual(Number.between({ minimum: 0, maximum: 5 })(6), false)

    assert.deepStrictEqual(Number.between(3, { minimum: 0, maximum: 5 }), true)
  })

  it("clamp", () => {
    assert.deepStrictEqual(Number.clamp({ minimum: 0, maximum: 5 })(3), 3)
    assert.deepStrictEqual(Number.clamp({ minimum: 0, maximum: 5 })(-1), 0)
    assert.deepStrictEqual(Number.clamp({ minimum: 0, maximum: 5 })(6), 5)
  })

  it("min", () => {
    assert.deepStrictEqual(Number.min(2, 3), 2)
  })

  it("max", () => {
    assert.deepStrictEqual(Number.max(2, 3), 3)
  })

  it("sumAll", () => {
    assert.deepStrictEqual(Number.sumAll([2, 3, 4]), 9)
  })

  it("multiplyAll", () => {
    assert.deepStrictEqual(Number.multiplyAll([2, 0, 4]), 0)
    assert.deepStrictEqual(Number.multiplyAll([2, 3, 4]), 24)
  })
})
