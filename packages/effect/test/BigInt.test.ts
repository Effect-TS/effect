import { assert, describe, it } from "@effect/vitest"
import * as BigInt from "effect/BigInt"
import { assertNone, assertSome, throws } from "./utils/assert.ts"

describe("BigInt", () => {
  it("re-exports the global BigInt constructor", () => {
    assert.strictEqual(BigInt.Equivalence(1n, 1n), true)
    assert.strictEqual(BigInt.Equivalence(1n, 2n), false)
  })

  it("divide returns some for non-zero divisors in data-first and data-last forms", () => {
    assertSome(BigInt.divide(6n, 3n), 2n)
    assertNone(BigInt.divide(6n, 0n))
    assert.strictEqual(BigInt.divideUnsafe(6n, 3n), 2n)
  })

  it("sqrt returns integer square roots", () => {
    assertSome(BigInt.sqrt(4n), 2n)
    assertNone(BigInt.sqrt(-1n))
  })

  it("root returns integer n-th roots rounded toward zero", () => {
    assertSome(BigInt.root(-26n, 3), -2n)
    assertSome(BigInt.root(-(10n ** 40n), 5), -(10n ** 8n))
    for (const [base, degree] of [[3n, 5], [12345678901234567890n, 7], [2n, 8192], [10n ** 40n + 7n, 12]] as const) {
      const power = base ** BigInt.BigInt(degree)
      assertSome(BigInt.root(power, degree), base)
      assertSome(BigInt.root(power - 1n, degree), base - 1n)
      assertSome(BigInt.root(power + 1n, degree), base)
    }
    assertSome(BigInt.root(0n, 4), 0n)
    assertSome(BigInt.root(1n, 4), 1n)
    assertSome(BigInt.root(-1n, 3), -1n)
    assertSome(BigInt.root(-7n, 1), -7n)
    assertNone(BigInt.root(-16n, 4))
    assertNone(BigInt.root(16n, 0))
    assertNone(BigInt.root(16n, -2))

    // A degree at least the bit length leaves a root of ±1.
    assertSome(BigInt.root(2n ** 100n, 2 ** 40), 1n)
    assertSome(BigInt.root(-(2n ** 100n), Number.MAX_SAFE_INTEGER), -1n)
    assertSome(BigInt.root(2n ** 100n, 101), 1n)

    assertSome(BigInt.root(2n ** 100n, 100), 2n)
    assertSome(BigInt.root(2n ** 80000n, 5000), 65536n)
    assertSome(BigInt.root(2n ** 80000n - 1n, 5000), 65535n)
    assertSome(BigInt.root(2n ** 262144n, 8192), 2n ** 32n)

    for (const x of [0n, 1n, 2n, 3n, 4n, 15n, 16n, 17n, 2n ** 64n - 1n, 2n ** 64n, 10n ** 30n + 1n]) {
      assertSome(BigInt.root(x, 2), BigInt.sqrtUnsafe(x))
    }

    assertSome(BigInt.root(3)(27n), 3n)

    for (const degree of [0.5, NaN, Infinity, 2 ** 53]) {
      throws(() => BigInt.root(16n, degree), new RangeError(`Degree must be a safe integer, got ${degree}`))
    }
  })

  it("toNumber converts bigints in the safe integer range", () => {
    assertSome(BigInt.toNumber(42n), 42)
    assertNone(BigInt.toNumber(BigInt.BigInt(Number.MAX_SAFE_INTEGER) + 1n))
  })

  it("toNumber returns none outside the safe integer range", () => {
    assertSome(BigInt.fromString("42"), 42n)
    assertNone(BigInt.fromString(" "))
    assertNone(BigInt.fromString("a"))
  })

  it("fromNumber converts safe integers to bigint", () => {
    assertSome(BigInt.fromNumber(42), 42n)
    assertNone(BigInt.fromNumber(Number.MAX_SAFE_INTEGER + 1))
  })

  it("fromNumber returns none for unsafe or non-integral numbers", () => {
    assert.strictEqual(BigInt.ReducerSum.combine(1n, 2n), 3n)
    assert.strictEqual(BigInt.ReducerSum.combine(BigInt.ReducerSum.initialValue, 2n), 2n)
    assert.strictEqual(BigInt.ReducerSum.combine(2n, BigInt.ReducerSum.initialValue), 2n)
  })

  it("ReducerMultiply combines values with one as the identity", () => {
    assert.strictEqual(BigInt.ReducerMultiply.combine(2n, 3n), 6n)
    assert.strictEqual(BigInt.ReducerMultiply.combine(BigInt.ReducerMultiply.initialValue, 2n), 2n)
    assert.strictEqual(BigInt.ReducerMultiply.combine(2n, BigInt.ReducerMultiply.initialValue), 2n)
  })

  it("CombinerMax returns the larger bigint", () => {
    assert.strictEqual(BigInt.CombinerMax.combine(1n, 2n), 2n)
  })

  it("CombinerMin returns the smaller bigint", () => {
    assert.strictEqual(BigInt.CombinerMin.combine(1n, 2n), 1n)
  })

  it("returns a non-negative greatest common divisor", () => {
    assert.strictEqual(BigInt.gcd(-6n, 4n), 2n)
  })

  it("returns a non-negative least common multiple", () => {
    assert.strictEqual(BigInt.lcm(6n, -4n), 12n)
  })

  it("returns zero for two zero operands", () => {
    assert.strictEqual(BigInt.lcm(0n, 0n), 0n)
  })

  it("Order compares bigints", () => {
    assert.strictEqual(BigInt.Order(1n, 2n), -1)
    assert.strictEqual(BigInt.Order(2n, 1n), 1)
    assert.strictEqual(BigInt.Order(1n, 1n), 0)
  })

  it("isLessThan and isLessThanOrEqualTo compare against an upper bound", () => {
    assert.strictEqual(BigInt.isLessThan(2n, 3n), true)
    assert.strictEqual(BigInt.isLessThan(3n, 3n), false)
    assert.strictEqual(BigInt.isLessThanOrEqualTo(3n, 3n), true)
    assert.strictEqual(BigInt.isLessThanOrEqualTo(4n, 3n), false)
  })

  it("isGreaterThan and isGreaterThanOrEqualTo compare against a lower bound", () => {
    assert.strictEqual(BigInt.isGreaterThan(4n, 3n), true)
    assert.strictEqual(BigInt.isGreaterThan(3n, 3n), false)
    assert.strictEqual(BigInt.isGreaterThanOrEqualTo(3n, 3n), true)
    assert.strictEqual(BigInt.isGreaterThanOrEqualTo(2n, 3n), false)
  })

  it("between checks inclusive range membership", () => {
    assert.strictEqual(BigInt.between(3n, { minimum: 1n, maximum: 5n }), true)
    assert.strictEqual(BigInt.between(0n, { minimum: 1n, maximum: 5n }), false)
    assert.strictEqual(BigInt.between(6n, { minimum: 1n, maximum: 5n }), false)
  })

  it("clamp restricts a bigint to an inclusive range", () => {
    assert.strictEqual(BigInt.clamp(3n, { minimum: 1n, maximum: 5n }), 3n)
    assert.strictEqual(BigInt.clamp(0n, { minimum: 1n, maximum: 5n }), 1n)
    assert.strictEqual(BigInt.clamp(6n, { minimum: 1n, maximum: 5n }), 5n)
  })

  it("min and max select the smaller and larger bigint", () => {
    assert.strictEqual(BigInt.min(2n, 3n), 2n)
    assert.strictEqual(BigInt.max(2n, 3n), 3n)
  })

  it("sign returns the ordering of a bigint against zero", () => {
    assert.strictEqual(BigInt.sign(5n), 1)
    assert.strictEqual(BigInt.sign(-5n), -1)
    assert.strictEqual(BigInt.sign(0n), 0)
  })

  it("isBigInt refines bigints", () => {
    assert.strictEqual(BigInt.isBigInt(1n), true)
    assert.strictEqual(BigInt.isBigInt(1), false)
  })

  it("sum, subtract and multiply combine two bigints", () => {
    assert.strictEqual(BigInt.sum(2n, 3n), 5n)
    assert.strictEqual(BigInt.subtract(2n, 3n), -1n)
    assert.strictEqual(BigInt.multiply(2n, 3n), 6n)
  })

  it("increment and decrement step by one", () => {
    assert.strictEqual(BigInt.increment(2n), 3n)
    assert.strictEqual(BigInt.decrement(2n), 1n)
  })

  it("abs returns the absolute value", () => {
    assert.strictEqual(BigInt.abs(-5n), 5n)
    assert.strictEqual(BigInt.abs(5n), 5n)
  })

  it("remainder keeps the sign of the dividend", () => {
    assert.strictEqual(BigInt.remainder(-10n, 3n), -1n)
  })

  it("sumAll and multiplyAll fold an iterable", () => {
    assert.strictEqual(BigInt.sumAll([2n, 3n, 4n]), 9n)
    assert.strictEqual(BigInt.multiplyAll([2n, 3n, 4n]), 24n)
    assert.strictEqual(BigInt.multiplyAll([]), 1n)
  })

  it("sqrtUnsafe returns integer square roots and throws for negatives", () => {
    assert.strictEqual(BigInt.sqrtUnsafe(17n), 4n)
    assert.throws(() => BigInt.sqrtUnsafe(-1n), RangeError)
  })

  it("rootUnsafe returns integer n-th roots and throws when there is none", () => {
    assert.strictEqual(BigInt.rootUnsafe(1024n, 10), 2n)
    assert.strictEqual(BigInt.rootUnsafe(10)(1023n), 1n)
    throws(() => BigInt.rootUnsafe(-16n, 4), new RangeError("Cannot take an integer root of degree 4 of -16"))
    throws(() => BigInt.rootUnsafe(16n, 0), new RangeError("Cannot take an integer root of degree 0 of 16"))
    for (const degree of [0.5, NaN, Infinity, 2 ** 53]) {
      throws(() => BigInt.rootUnsafe(16n, degree), new RangeError(`Degree must be a safe integer, got ${degree}`))
    }
  })
})
