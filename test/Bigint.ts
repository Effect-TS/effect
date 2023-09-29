import { deepStrictEqual } from "effect-test/util"
import * as Bigint from "effect/Bigint"
import { pipe } from "effect/Function"

describe.concurrent("Bigint", () => {
  it("sign", () => {
    assert.deepStrictEqual(Bigint.sign(-5n), -1)
    assert.deepStrictEqual(Bigint.sign(0n), 0)
    assert.deepStrictEqual(Bigint.sign(5n), 1)
  })

  it("isBigint", () => {
    expect(Bigint.isBigint(1n)).toEqual(true)
    expect(Bigint.isBigint(1)).toEqual(false)
    expect(Bigint.isBigint("a")).toEqual(false)
    expect(Bigint.isBigint(true)).toEqual(false)
  })

  it("sum", () => {
    deepStrictEqual(pipe(1n, Bigint.sum(2n)), 3n)
  })

  it("multiply", () => {
    deepStrictEqual(pipe(2n, Bigint.multiply(3n)), 6n)
  })

  it("subtract", () => {
    deepStrictEqual(pipe(3n, Bigint.subtract(1n)), 2n)
  })

  it("divide", () => {
    deepStrictEqual(pipe(6n, Bigint.divide(2n)), 3n)
  })

  it("increment", () => {
    deepStrictEqual(Bigint.increment(2n), 3n)
  })

  it("decrement", () => {
    deepStrictEqual(Bigint.decrement(2n), 1n)
  })

  it("Equivalence", () => {
    expect(Bigint.Equivalence(1n, 1n)).toBe(true)
    expect(Bigint.Equivalence(1n, 2n)).toBe(false)
  })

  it("Order", () => {
    deepStrictEqual(Bigint.Order(1n, 2n), -1)
    deepStrictEqual(Bigint.Order(2n, 1n), 1)
    deepStrictEqual(Bigint.Order(2n, 2n), 0)
  })

  it("lessThan", () => {
    assert.deepStrictEqual(Bigint.lessThan(2n, 3n), true)
    assert.deepStrictEqual(Bigint.lessThan(3n, 3n), false)
    assert.deepStrictEqual(Bigint.lessThan(4n, 3n), false)
  })

  it("lessThanOrEqualTo", () => {
    assert.deepStrictEqual(Bigint.lessThanOrEqualTo(2n, 3n), true)
    assert.deepStrictEqual(Bigint.lessThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(Bigint.lessThanOrEqualTo(4n, 3n), false)
  })

  it("greaterThan", () => {
    assert.deepStrictEqual(Bigint.greaterThan(2n, 3n), false)
    assert.deepStrictEqual(Bigint.greaterThan(3n, 3n), false)
    assert.deepStrictEqual(Bigint.greaterThan(4n, 3n), true)
  })

  it("greaterThanOrEqualTo", () => {
    assert.deepStrictEqual(Bigint.greaterThanOrEqualTo(2n, 3n), false)
    assert.deepStrictEqual(Bigint.greaterThanOrEqualTo(3n, 3n), true)
    assert.deepStrictEqual(Bigint.greaterThanOrEqualTo(4n, 3n), true)
  })

  it("between", () => {
    assert.deepStrictEqual(Bigint.between(0n, 5n)(3n), true)
    assert.deepStrictEqual(Bigint.between(0n, 5n)(-1n), false)
    assert.deepStrictEqual(Bigint.between(0n, 5n)(6n), false)
  })

  it("clamp", () => {
    assert.deepStrictEqual(Bigint.clamp(0n, 5n)(3n), 3n)
    assert.deepStrictEqual(Bigint.clamp(0n, 5n)(-1n), 0n)
    assert.deepStrictEqual(Bigint.clamp(0n, 5n)(6n), 5n)
  })

  it("min", () => {
    assert.deepStrictEqual(Bigint.min(2n, 3n), 2n)
  })

  it("max", () => {
    assert.deepStrictEqual(Bigint.max(2n, 3n), 3n)
  })

  it("sumAll", () => {
    assert.deepStrictEqual(Bigint.sumAll([2n, 3n, 4n]), 9n)
  })

  it("multiplyAll", () => {
    assert.deepStrictEqual(Bigint.multiplyAll([2n, 0n, 4n]), 0n)
    assert.deepStrictEqual(Bigint.multiplyAll([2n, 3n, 4n]), 24n)
  })
})
