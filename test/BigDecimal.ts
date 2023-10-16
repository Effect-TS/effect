import { deepStrictEqual } from "effect-test/util"
import * as BigDecimal from "effect/BigDecimal"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"

describe.concurrent("BigDecimal", () => {
  it("sign", () => {
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal._make(-5n)), -1)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal._make(0n)), 0)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal._make(5n)), 1)
  })

  it("isBigDecimal", () => {
    expect(BigDecimal.isBigDecimal(BigDecimal._make(1n))).toEqual(true)
    expect(BigDecimal.isBigDecimal(1)).toEqual(false)
    expect(BigDecimal.isBigDecimal("a")).toEqual(false)
    expect(BigDecimal.isBigDecimal(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(BigDecimal._make(1n), BigDecimal.sum(BigDecimal._make(2n))), BigDecimal._make(3n))
  })

  it("multiply", () => {
    deepStrictEqual(pipe(BigDecimal._make(2n), BigDecimal.multiply(BigDecimal._make(3n))), BigDecimal._make(6n))
  })

  it("subtract", () => {
    deepStrictEqual(pipe(BigDecimal._make(3n), BigDecimal.subtract(BigDecimal._make(1n))), BigDecimal._make(2n))
  })

  it("divide", () => {
    deepStrictEqual(
      pipe(BigDecimal._make(6n), BigDecimal.divide(BigDecimal._make(2n))),
      Either.right(BigDecimal._make(3n))
    )
  })

  it("Equivalence", () => {
    expect(BigDecimal.Equivalence(BigDecimal._make(1n), BigDecimal._make(1n))).toBe(true)
    expect(BigDecimal.Equivalence(BigDecimal._make(1n), BigDecimal._make(2n))).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(BigDecimal.Order(BigDecimal._make(1n), BigDecimal._make(2n)), -1)
    deepStrictEqual(BigDecimal.Order(BigDecimal._make(2n), BigDecimal._make(1n)), 1)
    deepStrictEqual(BigDecimal.Order(BigDecimal._make(2n), BigDecimal._make(2n)), 0)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal._make(2n), BigDecimal._make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal._make(3n), BigDecimal._make(3n)), false)
    assert.deepStrictEqual(BigDecimal.lessThan(BigDecimal._make(4n), BigDecimal._make(3n)), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal._make(2n), BigDecimal._make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal._make(3n), BigDecimal._make(3n)), true)
    assert.deepStrictEqual(BigDecimal.lessThanOrEqualTo(BigDecimal._make(4n), BigDecimal._make(3n)), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal._make(2n), BigDecimal._make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal._make(3n), BigDecimal._make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThan(BigDecimal._make(4n), BigDecimal._make(3n)), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal._make(2n), BigDecimal._make(3n)), false)
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal._make(3n), BigDecimal._make(3n)), true)
    assert.deepStrictEqual(BigDecimal.greaterThanOrEqualTo(BigDecimal._make(4n), BigDecimal._make(3n)), true)
  })

  it("between", () => {
    assert.deepStrictEqual(BigDecimal.between(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(3n)), true)
    assert.deepStrictEqual(BigDecimal.between(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(-1n)), false)
    assert.deepStrictEqual(BigDecimal.between(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(6n)), false)
  })

  it("clamp", () => {
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(3n)),
      BigDecimal._make(3n)
    )
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(-1n)),
      BigDecimal._make(0n)
    )
    assert.deepStrictEqual(
      BigDecimal.clamp(BigDecimal._make(0n), BigDecimal._make(5n))(BigDecimal._make(6n)),
      BigDecimal._make(5n)
    )
  })

  it("min", () => {
    assert.deepStrictEqual(BigDecimal.min(BigDecimal._make(2n), BigDecimal._make(3n)), BigDecimal._make(2n))
  })

  it("max", () => {
    assert.deepStrictEqual(BigDecimal.max(BigDecimal._make(2n), BigDecimal._make(3n)), BigDecimal._make(3n))
  })

  it("abs", () => {
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal._make(2n)), BigDecimal._make(2n))
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal._make(-3n)), BigDecimal._make(3n))
  })
})
