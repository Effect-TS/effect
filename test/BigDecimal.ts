import { deepStrictEqual } from "effect-test/util"
import * as BigDecimal from "effect/BigDecimal"
import * as Option from "effect/Option"

describe.concurrent("BigDecimal", () => {
  it("sign", () => {
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(-5n)), -1)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(0n)), 0)
    assert.deepStrictEqual(BigDecimal.sign(BigDecimal.make(5n)), 1)
  })

  it("isBigDecimal", () => {
    expect(BigDecimal.isBigDecimal(BigDecimal.make(1n))).toEqual(true)
    expect(BigDecimal.isBigDecimal(1)).toEqual(false)
    expect(BigDecimal.isBigDecimal(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(BigDecimal.sum(BigDecimal.make(2n), BigDecimal.make(1n)), BigDecimal.make(3n))
    deepStrictEqual(BigDecimal.sum(BigDecimal.scaled(300000n, 5), BigDecimal.make(50n)), BigDecimal.scaled(5300000n, 5))
    deepStrictEqual(
      BigDecimal.sum(BigDecimal.scaled(123n, 2), BigDecimal.scaled(45678n, 7)), // 1.23 + 0.0045678
      BigDecimal.scaled(12345678n, 7) // 1.2345678
    )
  })

  it("multiply", () => {
    deepStrictEqual(BigDecimal.multiply(BigDecimal.make(3n), BigDecimal.make(2n)), BigDecimal.make(6n))
  })

  it("subtract", () => {
    deepStrictEqual(BigDecimal.subtract(BigDecimal.make(3n), BigDecimal.make(1n)), BigDecimal.make(2n))
  })

  it("divide", () => {
    deepStrictEqual(
      BigDecimal.divide(BigDecimal.make(6n), BigDecimal.make(2n)),
      Option.some(BigDecimal.make(3n))
    )
    deepStrictEqual(
      BigDecimal.divide(BigDecimal.make(6n), BigDecimal.make(0n)),
      Option.none()
    )
  })

  it("unsafeDivide", () => {
    deepStrictEqual(
      BigDecimal.unsafeDivide(BigDecimal.make(6n), BigDecimal.make(2n)),
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
    assert.deepStrictEqual(BigDecimal.min(BigDecimal.make(5n), BigDecimal.make(0.1)), BigDecimal.make(0.1))
    assert.deepStrictEqual(BigDecimal.min(BigDecimal.make(0.005), BigDecimal.make(3n)), BigDecimal.make(0.005))
    assert.deepStrictEqual(BigDecimal.min(BigDecimal.make(123.456), BigDecimal.make(1.2)), BigDecimal.make(1.2))
  })

  it("max", () => {
    assert.deepStrictEqual(BigDecimal.max(BigDecimal.make(2n), BigDecimal.make(3n)), BigDecimal.make(3n))
    assert.deepStrictEqual(BigDecimal.max(BigDecimal.make(5n), BigDecimal.make(0.1)), BigDecimal.make(5n))
    assert.deepStrictEqual(BigDecimal.max(BigDecimal.make(0.005), BigDecimal.make(3n)), BigDecimal.make(3n))
    assert.deepStrictEqual(BigDecimal.max(BigDecimal.make(123.456), BigDecimal.make(1.2)), BigDecimal.make(123.456))
  })

  it("abs", () => {
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(2n)), BigDecimal.make(2n))
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(-3n)), BigDecimal.make(3n))
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(0.000456)), BigDecimal.make(0.000456))
    assert.deepStrictEqual(BigDecimal.abs(BigDecimal.make(-0.123)), BigDecimal.make(0.123))
  })

  it("format", () => {
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.make(2n)), "2")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.make(-2n)), "-2")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.make(0.123)), "0.123")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.make(200n)), "200")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.scaled(200n, -5)), "20000000")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.scaled(-200n, -5)), "-20000000")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.scaled(200n, 2)), "2.00")
    assert.deepStrictEqual(BigDecimal.format(BigDecimal.scaled(200n, 3)), "0.200")
    assert.deepStrictEqual(Option.map(BigDecimal.parse("0.123000"), BigDecimal.format), Option.some("0.123000"))
    assert.deepStrictEqual(Option.map(BigDecimal.parse("-456.123"), BigDecimal.format), Option.some("-456.123"))
  })
})
