import type { Brand, Either, Option } from "effect"
import { HashSet, pipe } from "effect"
import * as Integer from "effect/Integer"
import { describe, expect, it } from "tstyche"

declare const _number: number

describe("Integer", () => {
  const a = Integer.of(10)
  const b = Integer.of(-5)

  it("of", () => {
    expect(Integer.of(_number)).type.toBe<Integer.Integer>()
    expect(Integer.of(_number)).type.toBeAssignableTo<number>()
  })

  it("option", () => {
    expect(Integer.option(_number)).type.toBe<Option.Option<Integer.Integer>>()
    expect(Integer.option(_number)).type.toBeAssignableTo<
      Option.Option<number>
    >()
  })

  it("either", () => {
    expect(Integer.either(_number)).type.toBe<
      Either.Either<Integer.Integer, Brand.Brand.BrandErrors>
    >()
    expect(Integer.either(_number)).type.toBeAssignableTo<
      Either.Either<number, Brand.Brand.BrandErrors>
    >()
  })

  it("zero", () => {
    expect(Integer.zero).type.toBe<Integer.Integer>()
    expect(Integer.zero).type.toBeAssignableTo<number>()
  })

  it("one", () => {
    expect(Integer.one).type.toBe<Integer.Integer>()
    expect(Integer.one).type.toBeAssignableTo<number>()
  })

  it("isInteger", () => {
    const value: unknown = 42
    expect(value).type.not.toBeAssignableTo<Integer.Integer>()

    if (Integer.isInteger(value)) {
      expect(value).type.toBe<Integer.Integer>()
      expect(value).type.toBeAssignableWith<Integer.Integer>()
    }

    // Type guard should properly narrow union types
    const numOrString: number | string = 123
    expect(numOrString).type.not.toBeAssignableTo<Integer.Integer>()
    if (Integer.isInteger(numOrString)) {
      expect(numOrString).type.toBeAssignableTo<Integer.Integer>()
      expect<string>().type.not.toBeAssignableTo<typeof numOrString>()
    }
  })

  it("sum", () => {
    const dataLast = Integer.sum(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.sum

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Integer
    expect(Integer.sum(a, b)).type.toBeAssignableTo<Integer.Integer>()
    expect(pipe(a, Integer.sum(b))).type.toBeAssignableTo<Integer.Integer>()
  })

  it("subtract", () => {
    const dataLast = Integer.subtract(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.subtract

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Integer
    expect(Integer.subtract(a, b)).type.toBeAssignableTo<Integer.Integer>()
    expect(
      pipe(a, Integer.subtract(b))
    ).type.toBeAssignableTo<Integer.Integer>()
  })

  it("multiply", () => {
    const dataLast = Integer.multiply(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.multiply

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Integer
    expect(Integer.multiply(a, b)).type.toBeAssignableTo<Integer.Integer>()
    expect(
      pipe(a, Integer.multiply(b))
    ).type.toBeAssignableTo<Integer.Integer>()
  })

  it("divideToNumber", () => {
    const dataLast = Integer.divideToNumber(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.divideToNumber

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type: division for the set of Integer is not total;
    expect(Integer.divideToNumber(a, b)).type.not.toBeAssignableTo<
      Option.Option<Integer.Integer>
    >()
    expect(pipe(a, Integer.divideToNumber(b))).type.toBeAssignableTo<
      Option.Option<number>
    >()
  })

  it("increment", () => {
    type DataFirst = typeof Integer.increment

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Integer
    expect(Integer.increment(a)).type.toBeAssignableTo<Integer.Integer>()
    expect(pipe(a, Integer.increment)).type.toBeAssignableTo<Integer.Integer>()
  })

  it("decrement", () => {
    type DataFirst = typeof Integer.decrement

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Integer
    expect(Integer.decrement(a)).type.toBeAssignableTo<Integer.Integer>()
    expect(pipe(a, Integer.decrement)).type.toBeAssignableTo<Integer.Integer>()
  })

  it("Equivalence", () => {
    type DataFirst = typeof Integer.Equivalence

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    // test the output type
    expect(Integer.Equivalence(a, b)).type.toBeAssignableTo<boolean>()
  })

  it("Order", () => {
    type DataFirst = typeof Integer.Order

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    // test the output type
    expect(Integer.Order(a, b)).type.toBeAssignableTo<-1 | 0 | 1>()
  })

  it("lessThan", () => {
    const dataLast = Integer.lessThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.lessThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.lessThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Integer.lessThan(b))).type.toBe<boolean>()
  })

  it("lessThanOrEqualTo", () => {
    const dataLast = Integer.lessThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.lessThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.lessThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Integer.lessThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("greaterThan", () => {
    const dataLast = Integer.greaterThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.greaterThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.greaterThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Integer.greaterThan(b))).type.toBe<boolean>()
  })

  it("greaterThanOrEqualTo", () => {
    const dataLast = Integer.greaterThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.greaterThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.greaterThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Integer.greaterThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("between", () => {
    const options = { minimum: a, maximum: b }
    const dataLast = Integer.between(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.between

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, { minimum: Integer.Integer; maximum: Integer.Integer }]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, { minimum: number; maximum: number }]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.between(a, options)).type.toBe<boolean>()
    expect(pipe(a, Integer.between(options))).type.toBe<boolean>()
  })

  it("clamp", () => {
    const options = { minimum: a, maximum: b }
    const dataLast = Integer.clamp(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.clamp

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, { minimum: Integer.Integer; maximum: Integer.Integer }]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, { minimum: number; maximum: number }]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.clamp(a, options)).type.toBe<Integer.Integer>()
    expect(
      pipe(a, Integer.clamp(options))
    ).type.not.toBeAssignableWith<number>()
  })

  it("min", () => {
    const dataLast = Integer.min(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.min

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.min(a, b)).type.toBe<Integer.Integer>()
    expect(pipe(a, Integer.min(b))).type.not.toBeAssignableWith<number>()
  })

  it("max", () => {
    const dataLast = Integer.max(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Integer.max

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Integer.Integer, Integer.Integer]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [number, number]
    >()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.max(a, b)).type.toBe<Integer.Integer>()
    expect(pipe(a, Integer.max(b))).type.not.toBeAssignableWith<number>()
  })

  it("sign", () => {
    type DataFirst = typeof Integer.sign

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Integer.Integer]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Integer.sign(a)).type.toBe<-1 | 0 | 1>()
  })

  it("sumAll", () => {
    type DataFirst = typeof Integer.sumAll

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Iterable<Integer.Integer>]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [Iterable<number>]
    >()

    // test the output type
    expect(
      Integer.sumAll(Array.of(a, b, a, b, a, b))
    ).type.toBe<Integer.Integer>()
    expect(
      Integer.sumAll(HashSet.make(a, b, a, b, a, b))
    ).type.not.toBeAssignableWith<number>()
  })

  it("multiplyAll", () => {
    type DataFirst = typeof Integer.multiplyAll

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<
      [Iterable<Integer.Integer>]
    >()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
      [Iterable<number>]
    >()

    // test the output type
    expect(
      Integer.multiplyAll(Array.of(a, b, a, b, a, b))
    ).type.toBe<Integer.Integer>()
    expect(
      Integer.multiplyAll(HashSet.make(a, b, a, b, a, b))
    ).type.not.toBeAssignableWith<number>()
  })
})
