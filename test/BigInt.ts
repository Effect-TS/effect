import { deepStrictEqual } from "effect-test/util"
import * as BigInt from "effect/BigInt"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"

describe.concurrent("BigInt", () => {
  it("sign", () => {
    assert.deepStrictEqual(BigInt.sign(-5n), -1)
    assert.deepStrictEqual(BigInt.sign(0n), 0)
    assert.deepStrictEqual(BigInt.sign(5n), 1)
  })

  it("isBigInt", () => {
    expect(BigInt.isBigInt(1n)).toEqual(true)
    expect(BigInt.isBigInt(1)).toEqual(false)
    expect(BigInt.isBigInt("a")).toEqual(false)
    expect(BigInt.isBigInt(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(1n, BigInt.sum(2n)), 3n)
  })

  it("multiply", () => {
    deepStrictEqual(pipe(2n, BigInt.multiply(3n)), 6n)
  })

  it("subtract", () => {
    deepStrictEqual(pipe(3n, BigInt.subtract(1n)), 2n)
  })

  it("divide", () => {
    deepStrictEqual(pipe(6n, BigInt.divide(2n)), Option.some(3n))
    deepStrictEqual(pipe(6n, BigInt.divide(0n)), Option.none())
  })

  it("unsafeDivide", () => {
    deepStrictEqual(pipe(6n, BigInt.unsafeDivide(2n)), 3n)
  })

  it("increment", () => {
    deepStrictEqual(BigInt.increment(2n), 3n)
  })

  it("decrement", () => {
    deepStrictEqual(BigInt.decrement(2n), 1n)
  })

  it("Equivalence", () => {
    expect(BigInt.Equivalence(1n, 1n)).toBe(true)
    expect(BigInt.Equivalence(1n, 2n)).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(BigInt.Order(1n, 2n), -1)
    deepStrictEqual(BigInt.Order(2n, 1n), 1)
    deepStrictEqual(BigInt.Order(2n, 2n), 0)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(BigInt.lessThan(2n, 3n), true)
    assert.deepStrictEqual(BigInt.lessThan(3n, 3n), false)
    assert.deepStrictEqual(BigInt.lessThan(4n, 3n), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(BigInt.lessThanOrEqualTo(2n, 3n), true)
    assert.deepStrictEqual(BigInt.lessThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(BigInt.lessThanOrEqualTo(4n, 3n), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(BigInt.greaterThan(2n, 3n), false)
    assert.deepStrictEqual(BigInt.greaterThan(3n, 3n), false)
    assert.deepStrictEqual(BigInt.greaterThan(4n, 3n), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(BigInt.greaterThanOrEqualTo(2n, 3n), false)
    assert.deepStrictEqual(BigInt.greaterThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(BigInt.greaterThanOrEqualTo(4n, 3n), true)
  })

  it("between", () => {
    assert.deepStrictEqual(BigInt.between(0n, 5n)(3n), true)
    assert.deepStrictEqual(BigInt.between(0n, 5n)(-1n), false)
    assert.deepStrictEqual(BigInt.between(0n, 5n)(6n), false)
  })

  it("clamp", () => {
    assert.deepStrictEqual(BigInt.clamp(0n, 5n)(3n), 3n)
    assert.deepStrictEqual(BigInt.clamp(0n, 5n)(-1n), 0n)
    assert.deepStrictEqual(BigInt.clamp(0n, 5n)(6n), 5n)
  })

  it("min", () => {
    assert.deepStrictEqual(BigInt.min(2n, 3n), 2n)
  })

  it("max", () => {
    assert.deepStrictEqual(BigInt.max(2n, 3n), 3n)
  })

  it("sumAll", () => {
    assert.deepStrictEqual(BigInt.sumAll([2n, 3n, 4n]), 9n)
  })

  it("multiplyAll", () => {
    assert.deepStrictEqual(BigInt.multiplyAll([2n, 0n, 4n]), 0n)
    assert.deepStrictEqual(BigInt.multiplyAll([2n, 3n, 4n]), 24n)
  })

  it("abs", () => {
    assert.deepStrictEqual(BigInt.abs(2n), 2n)
    assert.deepStrictEqual(BigInt.abs(-3n), 3n)
  })

  it("gcd", () => {
    assert.deepStrictEqual(BigInt.gcd(2n, 4n), 2n)
    assert.deepStrictEqual(BigInt.gcd(3n, 4n), 1n)
  })

  it("lcm", () => {
    assert.deepStrictEqual(BigInt.lcm(2n, 4n), 4n)
    assert.deepStrictEqual(BigInt.lcm(3n, 4n), 12n)
  })

  it("sqrt", () => {
    assert.deepStrictEqual(BigInt.sqrt(16n), Option.some(4n))
    assert.deepStrictEqual(BigInt.sqrt(81n), Option.some(9n))
    assert.deepStrictEqual(BigInt.sqrt(-123n), Option.none())
  })
})
