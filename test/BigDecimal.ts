import { deepStrictEqual } from "effect-test/util"
import * as BigDecimal from "effect/BigDecimal"
import * as Option from "effect/Option"
import { pipe } from "effect/Function"

describe.concurrent("BigDecimal", () => {
  it("sign", () => {
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(-5n)), -1)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(0n)), 0)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(5n)), 1)
  })

  it("isBigDecimal", () => {
    expect(BigDecimal.isBigDecimal(BigDecimal.make(1n))).toEqual(true)
    expect(BigDecimal.isBigDecimal(1)).toEqual(false)
    expect(BigDecimal.isBigDecimal("a")).toEqual(false)
    expect(BigDecimal.isBigDecimal(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(BigDecimal.make(1n), BigDecimal.sum(BigDecimal.make(2n))), BigDecimal.make(3n))
  })

  it("multiply", () => {
    deepStrictEqual(pipe(BigDecimal.make(2n), BigDecimal.multiply(BigDecimal.make(3n))), BigDecimal.make(6n))
  })

  it("subtract", () => {
    deepStrictEqual(pipe(BigDecimal.make(3n), BigDecimal.subtract(BigDecimal.make(1n))), BigDecimal.make(2n))
  })

  it("divide", () => {
    deepStrictEqual(
      pipe(BigDecimal.make(6n), BigDecimal.divide(BigDecimal.make(2n))),
      Option.some(BigDecimal.make(3n))
    )
    deepStrictEqual(
      pipe(BigDecimal.make(6n), BigDecimal.divide(BigDecimal.make(0n))),
      Option.none()
    )
  })

  it("unsafeDivide", () => {
    deepStrictEqual(
      pipe(BigDecimal.make(6n), BigDecimal.unsafeDivide(BigDecimal.make(2n))),
      BigDecimal.make(3n)
    )
  })

  it("Equivalence", () => {
    expect(BigDecimal.Equivalence(BigDecimal.make(1n), BigDecimal.make(1n))).toBe(true)
    expect(BigDecimal.Equivalence(BigDecimal.make(1n), BigDecimal.make(2n))).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(BigDecimal.Order(BigDecimal.make(1n), BigDecimal.make(2n)), -1)
    deepStrictEqual(BigDecimal.Order(BigDecimal.make(2n), BigDecimal.make(1n)), 1)
    deepStrictEqual(BigDecimal.Order(BigDecimal.make(2n), BigDecimal.make(2n)), 0)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal.make(2n), BigDecimal.make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal.make(3n), BigDecimal.make(3n)), false)
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal.make(4n), BigDecimal.make(3n)), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal.make(2n), BigDecimal.make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal.make(3n), BigDecimal.make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal.make(4n), BigDecimal.make(3n)), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal.make(2n), BigDecimal.make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal.make(3n), BigDecimal.make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal.make(4n), BigDecimal.make(3n)), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal.make(2n), BigDecimal.make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal.make(3n), BigDecimal.make(3n)), true)
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal.make(4n), BigDecimal.make(3n)), true)
  })

  it("between", () => {
    assert.deepStrictEqual(BigDecimal.between(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(3n)), true)
    assert.deepStrictEqual(BigDecimal.between(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(-1n)), false)
    assert.deepStrictEqual(BigDecimal.between(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(6n)), false)
  })

  it("clamp", () => {
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(3n)),
      BigDecimal.make(3n)
    )
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(-1n)),
      BigDecimal.make(0n)
    )
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal.make(0n), BigDecimal.make(5n))(BigDecimal.make(6n)),
      BigDecimal.make(5n)
    )
  })

  it("min", () => {
    assert.deepStrictEqual(BigDecimal.min(BigDecimal.make(2n), BigDecimal.make(3n)), BigDecimal.make(2n))
  })

  it("max", () => {
    assert.deepStrictEqual(BigDecimal.max(BigDecimal.make(2n), BigDecimal.make(3n)), BigDecimal.make(3n))
  })

  it("abs", () => {
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(2n)), BigDecimal.make(2n))
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(-3n)), BigDecimal.make(3n))
  })
})
