import { deepStrictEqual } from "effect-test/util"
import { pipe } from "effect/Function"
import * as Number_ from "effect/Number"
import * as Option from "effect/Option"
import { assert, describe, expect, it } from "vitest"

describe("Number", () => {
  it("isNumber", () => {
    expect(Number_.isNumber(1)).toEqual(true)
    expect(Number_.isNumber("a")).toEqual(false)
    expect(Number_.isNumber(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(1, Number_.sum(2)), 3)
  })

  it("multiply", () => {
    deepStrictEqual(pipe(2, Number_.multiply(3)), 6)
  })

  it("subtract", () => {
    deepStrictEqual(pipe(3, Number_.subtract(1)), 2)
  })

  it("divide", () => {
    deepStrictEqual(pipe(6, Number_.divide(2)), Option.some(3))
    deepStrictEqual(pipe(6, Number_.divide(0)), Option.none())
  })

  it("unsafeDivide", () => {
    deepStrictEqual(pipe(6, Number_.unsafeDivide(2)), 3)
  })

  it("decrement", () => {
    deepStrictEqual(Number_.decrement(2), 1)
  })

  it("Equivalence", () => {
    expect(Number_.Equivalence(1, 1)).toBe(true)
    expect(Number_.Equivalence(1, 2)).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(Number_.Order(1, 2), -1)
    deepStrictEqual(Number_.Order(2, 1), 1)
    deepStrictEqual(Number_.Order(2, 2), 0)
  })

  it("sign", () => {
    deepStrictEqual(Number_.sign(0), 0)
    deepStrictEqual(Number_.sign(0.0), 0)
    deepStrictEqual(Number_.sign(-0.1), -1)
    deepStrictEqual(Number_.sign(-10), -1)
    deepStrictEqual(Number_.sign(10), 1)
    deepStrictEqual(Number_.sign(0.1), 1)
  })

  it("remainder", () => {
    assert.deepStrictEqual(Number_.remainder(2, 2), 0)
    assert.deepStrictEqual(Number_.remainder(3, 2), 1)
    assert.deepStrictEqual(Number_.remainder(4, 2), 0)
    assert.deepStrictEqual(Number_.remainder(2.5, 2), 0.5)
    assert.deepStrictEqual(Number_.remainder(-2, 2), -0)
    assert.deepStrictEqual(Number_.remainder(-3, 2), -1)
    assert.deepStrictEqual(Number_.remainder(-4, 2), -0)
    assert.deepStrictEqual(Number_.remainder(-2.8, -.2), -0)
    assert.deepStrictEqual(Number_.remainder(-2, -.2), -0)
    assert.deepStrictEqual(Number_.remainder(-1.5, -.2), -0.1)
    assert.deepStrictEqual(Number_.remainder(0, -.2), 0)
    assert.deepStrictEqual(Number_.remainder(1, -.2), 0)
    assert.deepStrictEqual(Number_.remainder(2.6, -.2), 0)
    assert.deepStrictEqual(Number_.remainder(3.1, -.2), 0.1)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(Number_.lessThan(2, 3), true)
    assert.deepStrictEqual(Number_.lessThan(3, 3), false)
    assert.deepStrictEqual(Number_.lessThan(4, 3), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(Number_.lessThanOrEqualTo(2, 3), true)
    assert.deepStrictEqual(Number_.lessThanOrEqualTo(3, 3), true)
    assert.deepStrictEqual(Number_.lessThanOrEqualTo(4, 3), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(Number_.greaterThan(2, 3), false)
    assert.deepStrictEqual(Number_.greaterThan(3, 3), false)
    assert.deepStrictEqual(Number_.greaterThan(4, 3), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(Number_.greaterThanOrEqualTo(2, 3), false)
    assert.deepStrictEqual(Number_.greaterThanOrEqualTo(3, 3), true)
    assert.deepStrictEqual(Number_.greaterThanOrEqualTo(4, 3), true)
  })

  it("between", () => {
    assert.deepStrictEqual(Number_.between({ minimum: 0, maximum: 5 })(3), true)
    assert.deepStrictEqual(Number_.between({ minimum: 0, maximum: 5 })(-1), false)
    assert.deepStrictEqual(Number_.between({ minimum: 0, maximum: 5 })(6), false)

    assert.deepStrictEqual(Number_.between(3, { minimum: 0, maximum: 5 }), true)
  })

  it("clamp", () => {
    assert.deepStrictEqual(Number_.clamp({ minimum: 0, maximum: 5 })(3), 3)
    assert.deepStrictEqual(Number_.clamp({ minimum: 0, maximum: 5 })(-1), 0)
    assert.deepStrictEqual(Number_.clamp({ minimum: 0, maximum: 5 })(6), 5)
  })

  it("min", () => {
    assert.deepStrictEqual(Number_.min(2, 3), 2)
  })

  it("max", () => {
    assert.deepStrictEqual(Number_.max(2, 3), 3)
  })

  it("sumAll", () => {
    assert.deepStrictEqual(Number_.sumAll([2, 3, 4]), 9)
  })

  it("multiplyAll", () => {
    assert.deepStrictEqual(Number_.multiplyAll([2, 0, 4]), 0)
    assert.deepStrictEqual(Number_.multiplyAll([2, 3, 4]), 24)
  })

  it("parse", () => {
    assert.deepStrictEqual(Number_.parse("NaN"), Option.some(NaN))
    assert.deepStrictEqual(Number_.parse("Infinity"), Option.some(Infinity))
    assert.deepStrictEqual(Number_.parse("-Infinity"), Option.some(-Infinity))
    assert.deepStrictEqual(Number_.parse("42"), Option.some(42))
    assert.deepStrictEqual(Number_.parse("a"), Option.none())
  })

  it("fromString", () => {
    assert.deepStrictEqual(Number_.fromString("NaN"), Option.none())
    assert.deepStrictEqual(Number_.fromString("Infinity"), Option.some(Infinity))
    assert.deepStrictEqual(Number_.fromString("-Infinity"), Option.some(-Infinity))
    assert.deepStrictEqual(Number_.fromString("42"), Option.some(42))
    assert.deepStrictEqual(Number_.fromString(" 42 \n\r\t"), Option.some(42))
    assert.deepStrictEqual(Number_.fromString("3.14"), Option.some(3.14))
    assert.deepStrictEqual(Number_.fromString("1e3"), Option.some(1000))
    assert.deepStrictEqual(Number_.fromString("1e-3"), Option.some(0.001))
    assert.deepStrictEqual(Number_.fromString(""), Option.none())
    assert.deepStrictEqual(Number_.fromString("a"), Option.none())
  })

  it("fromBigInt", () => {
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(Number.MAX_SAFE_INTEGER)), Option.some(Number.MAX_SAFE_INTEGER))
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)), Option.none())
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(Number.MIN_SAFE_INTEGER)), Option.some(Number.MIN_SAFE_INTEGER))
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1)), Option.none())
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(0)), Option.some(0))
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(42)), Option.some(42))
    assert.deepStrictEqual(Number_.fromBigInt(BigInt(-42)), Option.some(-42))
  })
})
