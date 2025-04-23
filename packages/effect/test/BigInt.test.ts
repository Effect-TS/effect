import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { BigInt as BigInt_, pipe } from "effect"

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
    assertSome(pipe(6n, BigInt_.divide(2n)), 3n)
    assertNone(pipe(6n, BigInt_.divide(0n)))
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
    assertSome(BigInt_.sqrt(1n), 1n)
    assertSome(BigInt_.sqrt(16n), 4n)
    assertSome(BigInt_.sqrt(81n), 9n)
    assertNone(BigInt_.sqrt(-123n))
  })

  it("sqrt", () => {
    throws(() => BigInt_.unsafeSqrt(-1n), new RangeError("Cannot take the square root of a negative number"))
  })

  it("toNumber", () => {
    assertSome(BigInt_.toNumber(BigInt(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER)
    assertNone(BigInt_.toNumber(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)))
    assertSome(BigInt_.toNumber(BigInt(Number.MIN_SAFE_INTEGER)), Number.MIN_SAFE_INTEGER)
    assertNone(BigInt_.toNumber(BigInt(Number.MIN_SAFE_INTEGER) - BigInt(1)))
    assertSome(BigInt_.toNumber(BigInt(0)), 0)
    assertSome(BigInt_.toNumber(BigInt(42)), 42)
    assertSome(BigInt_.toNumber(BigInt(-42)), -42)
  })

  it("fromString", () => {
    assertNone(BigInt_.fromString("NaN"))
    assertNone(BigInt_.fromString("Infinity"))
    assertNone(BigInt_.fromString("-Infinity"))
    assertNone(BigInt_.fromString("3.14"))
    assertNone(BigInt_.fromString("-3.14"))
    assertNone(BigInt_.fromString("1e3"))
    assertNone(BigInt_.fromString("1e-3"))
    assertNone(BigInt_.fromString(""))
    assertNone(BigInt_.fromString("a"))
    assertSome(BigInt_.fromString("42"), BigInt(42))
    assertSome(BigInt_.fromString("\n\r\t 42 \n\r\t"), BigInt(42))
  })

  it("fromNumber", () => {
    assertSome(BigInt_.fromNumber(Number.MAX_SAFE_INTEGER), BigInt(Number.MAX_SAFE_INTEGER))
    assertNone(BigInt_.fromNumber(Number.MAX_SAFE_INTEGER + 1))
    assertSome(BigInt_.fromNumber(Number.MIN_SAFE_INTEGER), BigInt(Number.MIN_SAFE_INTEGER))
    assertNone(BigInt_.fromNumber(Number.MIN_SAFE_INTEGER - 1))
    assertNone(BigInt_.fromNumber(Infinity))
    assertNone(BigInt_.fromNumber(-Infinity))
    assertNone(BigInt_.fromNumber(NaN))
    assertNone(BigInt_.fromNumber(1e100))
    assertNone(BigInt_.fromNumber(-1e100))
    assertNone(BigInt_.fromNumber(3.14))
    assertNone(BigInt_.fromNumber(-3.14))
    assertSome(BigInt_.fromNumber(0), BigInt(0))
    assertSome(BigInt_.fromNumber(42), BigInt(42))
    assertSome(BigInt_.fromNumber(-42), BigInt(-42))
  })
})
