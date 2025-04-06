import { describe, it } from "@effect/vitest"
import { Number, pipe } from "effect"
import { assertFalse, assertNone, assertSome, assertTrue, strictEqual, throws } from "effect/test/util"

describe("Number", () => {
  it("isNumber", () => {
    assertTrue(Number.isNumber(1))
    assertFalse(Number.isNumber("a"))
    assertFalse(Number.isNumber(true))
  })

  it("sum", () => {
    strictEqual(pipe(1, Number.sum(2)), 3)
  })

  it("multiply", () => {
    strictEqual(pipe(2, Number.multiply(3)), 6)
  })

  it("subtract", () => {
    strictEqual(pipe(3, Number.subtract(1)), 2)
  })

  it("divide", () => {
    assertSome(pipe(6, Number.divide(2)), 3)
    assertNone(pipe(6, Number.divide(0)))
  })

  it("unsafeDivide", () => {
    const six = 6 as const
    const two = 2 as const

    strictEqual(pipe(six, Number.unsafeDivide(two)), Number.unsafeDivide(six, two))

    strictEqual(pipe(six, Number.unsafeDivide(two)), 3)
    strictEqual(pipe(six, Number.unsafeDivide(two)), 3)

    strictEqual(Number.unsafeDivide(0, six), 0)
    throws(
      () => Number.unsafeDivide(six, 0),
      Number.DivisionByZeroError.divisionByZero(six)
    )
    throws(
      () => Number.unsafeDivide(0, 0),
      Number.DivisionByZeroError.indeterminateForm()
    )
  })

  it("decrement", () => {
    strictEqual(Number.decrement(3.14), 2.14)

    strictEqual(Number.decrement(-0.69314), -1.69314)

    strictEqual(
      pipe(
        100,
        Number.decrement,
        Number.decrement,
        Number.decrement,
        Number.decrement,
        Number.decrement,
        Number.decrement,
        Number.decrement
      ),
      93
    )
  })

  it("Equivalence", () => {
    assertTrue(Number.Equivalence(1, 1))
    assertFalse(Number.Equivalence(1, 2))
  })

  it("Order", () => {
    strictEqual(Number.Order(1, 2), -1)
    strictEqual(Number.Order(2, 1), 1)
    strictEqual(Number.Order(2, 2), 0)
  })

  it("sign", () => {
    strictEqual(Number.sign(0), 0)
    strictEqual(Number.sign(0.0), 0)
    strictEqual(Number.sign(-0.1), -1)
    strictEqual(Number.sign(-10), -1)
    strictEqual(Number.sign(10), 1)
    strictEqual(Number.sign(0.1), 1)
  })

  it("remainder", () => {
    strictEqual(Number.remainder(2, 2), 0)
    strictEqual(Number.remainder(3, 2), 1)
    strictEqual(Number.remainder(4, 2), 0)
    strictEqual(Number.remainder(2.5, 2), 0.5)
    strictEqual(Number.remainder(-2, 2), -0)
    strictEqual(Number.remainder(-3, 2), -1)
    strictEqual(Number.remainder(-4, 2), -0)
    strictEqual(Number.remainder(-2.8, -.2), -0)
    strictEqual(Number.remainder(-2, -.2), -0)
    strictEqual(Number.remainder(-1.5, -.2), -0.1)
    strictEqual(Number.remainder(0, -.2), 0)
    strictEqual(Number.remainder(1, -.2), 0)
    strictEqual(Number.remainder(2.6, -.2), 0)
    strictEqual(Number.remainder(3.1, -.2), 0.1)
  })

  it("lessThan", () => {
    assertTrue(Number.lessThan(2, 3))
    assertFalse(Number.lessThan(3, 3))
    assertFalse(Number.lessThan(4, 3))
  })

  it("lessThanOrEqualTo", () => {
    assertTrue(Number.lessThanOrEqualTo(2, 3))
    assertTrue(Number.lessThanOrEqualTo(3, 3))
    assertFalse(Number.lessThanOrEqualTo(4, 3))
  })

  it("greaterThan", () => {
    assertFalse(Number.greaterThan(2, 3))
    assertFalse(Number.greaterThan(3, 3))
    assertTrue(Number.greaterThan(4, 3))
  })

  it("greaterThanOrEqualTo", () => {
    assertFalse(Number.greaterThanOrEqualTo(2, 3))
    assertTrue(Number.greaterThanOrEqualTo(3, 3))
    assertTrue(Number.greaterThanOrEqualTo(4, 3))
  })

  it("between", () => {
    assertTrue(Number.between({ minimum: 0, maximum: 5 })(3))
    assertFalse(Number.between({ minimum: 0, maximum: 5 })(-1))
    assertFalse(Number.between({ minimum: 0, maximum: 5 })(6))

    assertTrue(Number.between(3, { minimum: 0, maximum: 5 }))
  })

  it("clamp", () => {
    strictEqual(Number.clamp({ minimum: 0, maximum: 5 })(3), 3)
    strictEqual(Number.clamp({ minimum: 0, maximum: 5 })(-1), 0)
    strictEqual(Number.clamp({ minimum: 0, maximum: 5 })(6), 5)
  })

  it("min", () => {
    strictEqual(Number.min(2, 3), 2)
  })

  it("max", () => {
    strictEqual(Number.max(2, 3), 3)
  })

  it("sumAll", () => {
    strictEqual(Number.sumAll([2, 3, 4]), 9)
  })

  it("multiplyAll", () => {
    strictEqual(Number.multiplyAll([2, 0, 4]), 0)
    strictEqual(Number.multiplyAll([2, 3, 4]), 24)
  })

  it("parse", () => {
    assertSome(Number.parse("NaN"), NaN)
    assertSome(Number.parse("Infinity"), Infinity)
    assertSome(Number.parse("-Infinity"), -Infinity)
    assertSome(Number.parse("42"), 42)
    assertNone(Number.parse("a"))
  })

  it("round", () => {
    strictEqual(Number.round(1.1234, 2), 1.12)
    strictEqual(Number.round(2)(1.1234), 1.12)
    strictEqual(Number.round(0)(1.1234), 1)
    strictEqual(Number.round(0)(1.1234), 1)
    strictEqual(Number.round(1.567, 2), 1.57)
    strictEqual(Number.round(2)(1.567), 1.57)
  })
})
