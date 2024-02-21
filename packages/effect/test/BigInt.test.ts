import { deepStrictEqual } from "effect-test/util"
import * as BigInt_ from "effect/BigInt"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { assert, describe, expect, it } from "vitest"

describe("BigInt", () => {
  it("sign", () => {
    assert.deepStrictEqual(BigInt_.sign(-5n), -1)
    assert.deepStrictEqual(BigInt_.sign(0n), 0)
    assert.deepStrictEqual(BigInt_.sign(5n), 1)
  })

  it("isBigInt", () => {
    expect(BigInt_.isBigInt(1n)).toEqual(true)
    expect(BigInt_.isBigInt(1)).toEqual(false)
    expect(BigInt_.isBigInt("a")).toEqual(false)
    expect(BigInt_.isBigInt(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(1n, BigInt_.sum(2n)), 3n)
  })

  it("multiply", () => {
    deepStrictEqual(pipe(2n, BigInt_.multiply(3n)), 6n)
  })

  it("subtract", () => {
    deepStrictEqual(pipe(3n, BigInt_.subtract(1n)), 2n)
  })

  it("divide", () => {
    deepStrictEqual(pipe(6n, BigInt_.divide(2n)), Option.some(3n))
    deepStrictEqual(pipe(6n, BigInt_.divide(0n)), Option.none())
  })

  it("unsafeDivide", () => {
    deepStrictEqual(pipe(6n, BigInt_.unsafeDivide(2n)), 3n)
  })

  it("increment", () => {
    deepStrictEqual(BigInt_.increment(2n), 3n)
  })

  it("decrement", () => {
    deepStrictEqual(BigInt_.decrement(2n), 1n)
  })

  it("Equivalence", () => {
    expect(BigInt_.Equivalence(1n, 1n)).toBe(true)
    expect(BigInt_.Equivalence(1n, 2n)).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(BigInt_.Order(1n, 2n), -1)
    deepStrictEqual(BigInt_.Order(2n, 1n), 1)
    deepStrictEqual(BigInt_.Order(2n, 2n), 0)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(BigInt_.lessThan(2n, 3n), true)
    assert.deepStrictEqual(BigInt_.lessThan(3n, 3n), false)
    assert.deepStrictEqual(BigInt_.lessThan(4n, 3n), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(BigInt_.lessThanOrEqualTo(2n, 3n), true)
    assert.deepStrictEqual(BigInt_.lessThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(BigInt_.lessThanOrEqualTo(4n, 3n), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(BigInt_.greaterThan(2n, 3n), false)
    assert.deepStrictEqual(BigInt_.greaterThan(3n, 3n), false)
    assert.deepStrictEqual(BigInt_.greaterThan(4n, 3n), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(BigInt_.greaterThanOrEqualTo(2n, 3n), false)
    assert.deepStrictEqual(BigInt_.greaterThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(BigInt_.greaterThanOrEqualTo(4n, 3n), true)
  })

  it("between", () => {
    assert.deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(3n), true)
    assert.deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(-1n), false)
    assert.deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(6n), false)

    assert.deepStrictEqual(BigInt_.between(3n, { minimum: 0n, maximum: 5n }), true)
  })

  it("clamp", () => {
    assert.deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(3n), 3n)
    assert.deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(-1n), 0n)
    assert.deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(6n), 5n)

    assert.deepStrictEqual(BigInt_.clamp(3n, { minimum: 0n, maximum: 5n }), 3n)
  })

  it("min", () => {
    assert.deepStrictEqual(BigInt_.min(2n, 3n), 2n)
  })

  it("max", () => {
    assert.deepStrictEqual(BigInt_.max(2n, 3n), 3n)
  })

  it("sumAll", () => {
    assert.deepStrictEqual(BigInt_.sumAll([2n, 3n, 4n]), 9n)
  })

  it("multiplyAll", () => {
    assert.deepStrictEqual(BigInt_.multiplyAll([2n, 0n, 4n]), 0n)
    assert.deepStrictEqual(BigInt_.multiplyAll([2n, 3n, 4n]), 24n)
  })

  it("abs", () => {
    assert.deepStrictEqual(BigInt_.abs(2n), 2n)
    assert.deepStrictEqual(BigInt_.abs(-3n), 3n)
  })

  it("gcd", () => {
    assert.deepStrictEqual(BigInt_.gcd(2n, 4n), 2n)
    assert.deepStrictEqual(BigInt_.gcd(3n, 4n), 1n)
  })

  it("lcm", () => {
    assert.deepStrictEqual(BigInt_.lcm(2n, 4n), 4n)
    assert.deepStrictEqual(BigInt_.lcm(3n, 4n), 12n)
  })

  it("sqrt", () => {
    assert.deepStrictEqual(BigInt_.sqrt(1n), Option.some(1n))
    assert.deepStrictEqual(BigInt_.sqrt(16n), Option.some(4n))
    assert.deepStrictEqual(BigInt_.sqrt(81n), Option.some(9n))
    assert.deepStrictEqual(BigInt_.sqrt(-123n), Option.none())
  })

  it("sqrt", () => {
    expect(() => BigInt_.unsafeSqrt(-1n)).toThrow(new Error("Cannot take the square root of a negative number"))
  })

  it("toNumber", () => {
    assert.deepStrictEqual(BigInt_.toNumber(1n), Option.some(1))
    assert.deepStrictEqual(BigInt_.toNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n), Option.none())
  })
})
