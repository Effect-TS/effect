/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Option } from "effect"
import { HashSet, Number, pipe } from "effect"
import { describe, expect, it } from "tstyche"

describe("Number", () => {
  const a = 10
  const b = -5

  it("isNumber", () => {
    const value: unknown = 42
    expect(value).type.not.toBeAssignableTo<number>()

    if (Number.isNumber(value)) {
      expect(value).type.toBe<number>()
    }

    // Type guard should properly narrow union types
    const numOrString: number | string = 123
    if (Number.isNumber(numOrString)) {
      expect(numOrString).type.toBe<number>()
      expect(numOrString).type.not.toBeAssignableFrom<string>()
    }
  })

  it("sum", () => {
    const dataLast = Number.sum(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.sum

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()
    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.sum(a, b)).type.toBe<number>()
    expect(pipe(a, Number.sum(b))).type.toBe<number>()
  })

  it("subtract", () => {
    const dataLast = Number.subtract(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.subtract

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()
    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.subtract(a, b)).type.toBe<number>()
    expect(pipe(a, Number.subtract(b))).type.toBe<number>()
  })

  it("multiply", () => {
    const dataLast = Number.multiply(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.multiply

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.multiply(a, b)).type.toBe<number>()
    expect(pipe(a, Number.multiply(b))).type.toBe<number>()
  })

  it("divide", () => {
    const dataLast = Number.divide(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.divide

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.divide(a, b)).type.toBe<Option.Option<number>>()
    expect(pipe(a, Number.divide(b))).type.toBe<Option.Option<number>>()
  })

  it("unsafeDivide", () => {
    const dataLast = Number.unsafeDivide(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.unsafeDivide

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.unsafeDivide(a, b)).type.toBe<number>()
    expect(pipe(a, Number.unsafeDivide(b))).type.toBe<number>()
  })

  it("increment", () => {
    type DataFirst = typeof Number.increment

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.increment(a)).type.toBe<number>()
    expect(pipe(a, Number.increment)).type.toBe<number>()
  })

  it("decrement", () => {
    type DataFirst = typeof Number.decrement

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.decrement(a)).type.toBe<number>()
    expect(pipe(a, Number.decrement)).type.toBe<number>()
  })

  it("Equivalence", () => {
    type DataFirst = typeof Number.Equivalence

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    // test the output type
    expect(Number.Equivalence(a, b)).type.toBe<boolean>()
  })

  it("Order", () => {
    type DataFirst = typeof Number.Order

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    // test the output type
    expect(Number.Order(a, b)).type.toBe<-1 | 0 | 1>()
  })

  it("lessThan", () => {
    const dataLast = Number.lessThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.lessThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()
    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.lessThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Number.lessThan(b))).type.toBe<boolean>()
  })

  it("lessThanOrEqualTo", () => {
    const dataLast = Number.lessThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.lessThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.lessThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Number.lessThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("greaterThan", () => {
    const dataLast = Number.greaterThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.greaterThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.greaterThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Number.greaterThan(b))).type.toBe<boolean>()
  })

  it("greaterThanOrEqualTo", () => {
    const dataLast = Number.greaterThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.greaterThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.greaterThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Number.greaterThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("between", () => {
    const options = { minimum: a, maximum: b }

    const dataLast = Number.between(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.between

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<
      [number, { minimum: number; maximum: number }]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.between(a, options)).type.toBe<boolean>()
    expect(pipe(a, Number.between(options))).type.toBe<boolean>()
  })

  it("clamp", () => {
    const options = { minimum: a, maximum: b }

    const dataLast = Number.clamp(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.clamp

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<
      [number, { minimum: number; maximum: number }]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.clamp(a, options)).type.toBe<number>()
    expect(pipe(a, Number.clamp(options))).type.toBe<number>()
  })

  it("min", () => {
    const dataLast = Number.min(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.min

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.min(a, b)).type.toBe<number>()
    expect(pipe(a, Number.min(b))).type.toBe<number>()
  })

  it("max", () => {
    const dataLast = Number.max(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.max

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.max(a, b)).type.toBe<number>()
    expect(pipe(a, Number.max(b))).type.toBe<number>()
  })

  it("sign", () => {
    type DataFirst = typeof Number.sign

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.sign(a)).type.toBe<-1 | 0 | 1>()
  })

  it("sumAll", () => {
    type DataFirst = typeof Number.sumAll

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<
      [Iterable<number>]
    >()

    // test the output type
    expect(Number.sumAll([a, b, a, b, a, b])).type.toBe<number>()
    expect(Number.sumAll(HashSet.make(a, b, a, b, a, b))).type.toBe<number>()
  })

  it("multiplyAll", () => {
    type DataFirst = typeof Number.multiplyAll

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<
      [Iterable<number>]
    >()

    // test the output type
    expect(Number.multiplyAll([a, b, a, b, a, b])).type.toBe<number>()
    expect(
      Number.multiplyAll(HashSet.make(a, b, a, b, a, b))
    ).type.toBe<number>()
  })

  it("remainder", () => {
    const dataLast = Number.remainder(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.remainder

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.remainder(a, b)).type.toBe<number>()
    expect(pipe(a, Number.remainder(b))).type.toBe<number>()
  })

  it("nextPow2", () => {
    type DataFirst = typeof Number.nextPow2

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.nextPow2(a)).type.toBe<number>()
  })

  it("parse", () => {
    type DataFirst = typeof Number.parse

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[string]>()

    // test the output type
    expect(Number.parse("123")).type.toBe<Option.Option<number>>()
  })

  it("round", () => {
    const dataLast = Number.round(2)
    type DataLast = typeof dataLast
    type DataFirst = typeof Number.round

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableFrom<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableFrom<[number]>()

    // test the output type
    expect(Number.round(a, 2)).type.toBe<number>()
    expect(pipe(a, Number.round(2))).type.toBe<number>()
  })
})
