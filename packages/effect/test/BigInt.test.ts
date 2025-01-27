import { BigInt as BigInt_, Option, pipe } from "effect"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"
import { describe, it } from "vitest"

describe("BigInt", () => {
  it("sign", () => {
    strictEqual(BigInt_.sign(-5n), -1)
    strictEqual(BigInt_.sign(0n), 0)
    strictEqual(BigInt_.sign(5n), 1)
  })

  it("isBigInt", () => {
    assertTrue(BigInt_.isBigInt(1n))
    assertFalse(BigInt_.isBigInt(1))
    assertFalse(BigInt_.isBigInt("a"))
    assertFalse(BigInt_.isBigInt(true))
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
    assertTrue(BigInt_.Equivalence(1n, 1n))
    assertFalse(BigInt_.Equivalence(1n, 2n))
  })

  it("Order", () => {
    deepStrictEqual(BigInt_.Order(1n, 2n), -1)
    deepStrictEqual(BigInt_.Order(2n, 1n), 1)
    deepStrictEqual(BigInt_.Order(2n, 2n), 0)
  })

  it("lessThan", () => {
    deepStrictEqual(BigInt_.lessThan(2n, 3n), true)
    deepStrictEqual(BigInt_.lessThan(3n, 3n), false)
    deepStrictEqual(BigInt_.lessThan(4n, 3n), false)
  })

  it("lessThanOrEqualTo", () => {
    deepStrictEqual(BigInt_.lessThanOrEqualTo(2n, 3n), true)
    deepStrictEqual(BigInt_.lessThanOrEqualTo(3n, 3n), true)
    deepStrictEqual(BigInt_.lessThanOrEqualTo(4n, 3n), false)
  })

  it("greaterThan", () => {
    deepStrictEqual(BigInt_.greaterThan(2n, 3n), false)
    deepStrictEqual(BigInt_.greaterThan(3n, 3n), false)
    deepStrictEqual(BigInt_.greaterThan(4n, 3n), true)
  })

  it("greaterThanOrEqualTo", () => {
    deepStrictEqual(BigInt_.greaterThanOrEqualTo(2n, 3n), false)
    deepStrictEqual(BigInt_.greaterThanOrEqualTo(3n, 3n), true)
    deepStrictEqual(BigInt_.greaterThanOrEqualTo(4n, 3n), true)
  })

  it("between", () => {
    deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(3n), true)
    deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(-1n), false)
    deepStrictEqual(BigInt_.between({ minimum: 0n, maximum: 5n })(6n), false)

    deepStrictEqual(BigInt_.between(3n, { minimum: 0n, maximum: 5n }), true)
  })

  it("clamp", () => {
    deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(3n), 3n)
    deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(-1n), 0n)
    deepStrictEqual(BigInt_.clamp({ minimum: 0n, maximum: 5n })(6n), 5n)

    deepStrictEqual(BigInt_.clamp(3n, { minimum: 0n, maximum: 5n }), 3n)
  })

  it("min", () => {
    deepStrictEqual(BigInt_.min(2n, 3n), 2n)
  })

  it("max", () => {
    deepStrictEqual(BigInt_.max(2n, 3n), 3n)
  })

  it("sumAll", () => {
    deepStrictEqual(BigInt_.sumAll([2n, 3n, 4n]), 9n)
  })

  it("multiplyAll", () => {
    deepStrictEqual(BigInt_.multiplyAll([2n, 0n, 4n]), 0n)
    deepStrictEqual(BigInt_.multiplyAll([2n, 3n, 4n]), 24n)
  })

  it("abs", () => {
    deepStrictEqual(BigInt_.abs(2n), 2n)
    deepStrictEqual(BigInt_.abs(-3n), 3n)
  })

  it("gcd", () => {
    deepStrictEqual(BigInt_.gcd(2n, 4n), 2n)
    deepStrictEqual(BigInt_.gcd(3n, 4n), 1n)
  })

  it("lcm", () => {
    deepStrictEqual(BigInt_.lcm(2n, 4n), 4n)
    deepStrictEqual(BigInt_.lcm(3n, 4n), 12n)
  })

  it("sqrt", () => {
    deepStrictEqual(BigInt_.sqrt(1n), Option.some(1n))
    deepStrictEqual(BigInt_.sqrt(16n), Option.some(4n))
    deepStrictEqual(BigInt_.sqrt(81n), Option.some(9n))
    deepStrictEqual(BigInt_.sqrt(-123n), Option.none())
  })

  it("sqrt", () => {
    throws(() => BigInt_.unsafeSqrt(-1n), new Error("Cannot take the square root of a negative number"))
  })

  it("toNumber", () => {
    deepStrictEqual(BigInt_.toNumber(BigInt(Number.MAX_SAFE_INTEGER)), Option.some(Number.MAX_SAFE_INTEGER))
    deepStrictEqual(BigInt_.toNumber(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)), Option.none())
    deepStrictEqual(BigInt_.toNumber(BigInt(Number.MIN_SAFE_INTEGER)), Option.some(Number.MIN_SAFE_INTEGER))
    deepStrictEqual(BigInt_.toNumber(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1)), Option.none())
    deepStrictEqual(BigInt_.toNumber(BigInt(0)), Option.some(0))
    deepStrictEqual(BigInt_.toNumber(BigInt(42)), Option.some(42))
    deepStrictEqual(BigInt_.toNumber(BigInt(-42)), Option.some(-42))
  })

  it("fromString", () => {
    deepStrictEqual(BigInt_.fromString("NaN"), Option.none())
    deepStrictEqual(BigInt_.fromString("Infinity"), Option.none())
    deepStrictEqual(BigInt_.fromString("-Infinity"), Option.none())
    deepStrictEqual(BigInt_.fromString("3.14"), Option.none())
    deepStrictEqual(BigInt_.fromString("-3.14"), Option.none())
    deepStrictEqual(BigInt_.fromString("1e3"), Option.none())
    deepStrictEqual(BigInt_.fromString("1e-3"), Option.none())
    deepStrictEqual(BigInt_.fromString(""), Option.none())
    deepStrictEqual(BigInt_.fromString("a"), Option.none())
    deepStrictEqual(BigInt_.fromString("42"), Option.some(BigInt(42)))
    deepStrictEqual(BigInt_.fromString("\n\r\t 42 \n\r\t"), Option.some(BigInt(42)))
  })

  it("fromNumber", () => {
    deepStrictEqual(BigInt_.fromNumber(Number.MAX_SAFE_INTEGER), Option.some(BigInt(Number.MAX_SAFE_INTEGER)))
    deepStrictEqual(BigInt_.fromNumber(Number.MAX_SAFE_INTEGER + 1), Option.none())
    deepStrictEqual(BigInt_.fromNumber(Number.MIN_SAFE_INTEGER), Option.some(BigInt(Number.MIN_SAFE_INTEGER)))
    deepStrictEqual(BigInt_.fromNumber(Number.MIN_SAFE_INTEGER - 1), Option.none())
    deepStrictEqual(BigInt_.fromNumber(Infinity), Option.none())
    deepStrictEqual(BigInt_.fromNumber(-Infinity), Option.none())
    deepStrictEqual(BigInt_.fromNumber(NaN), Option.none())
    deepStrictEqual(BigInt_.fromNumber(1e100), Option.none())
    deepStrictEqual(BigInt_.fromNumber(-1e100), Option.none())
    deepStrictEqual(BigInt_.fromNumber(3.14), Option.none())
    deepStrictEqual(BigInt_.fromNumber(-3.14), Option.none())
    deepStrictEqual(BigInt_.fromNumber(0), Option.some(BigInt(0)))
    deepStrictEqual(BigInt_.fromNumber(42), Option.some(BigInt(42)))
    deepStrictEqual(BigInt_.fromNumber(-42), Option.some(BigInt(-42)))
  })
})
