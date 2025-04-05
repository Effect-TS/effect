import type { Brand, Either, Option } from "effect"
import { HashSet, Int, pipe } from "effect"
import { describe, expect, it } from "tstyche"

declare const _number: number

describe("Int", () => {
  const a = Int.of(10)
  const b = Int.of(-5)

  it("of", () => {
    expect(Int.of(_number)).type.toBe<Int.Int>()
    expect(Int.of(_number)).type.toBeAssignableTo<number>()
  })

  it("option", () => {
    expect(Int.option(_number)).type.toBe<Option.Option<Int.Int>>()
    expect(Int.option(_number)).type.toBeAssignableTo<Option.Option<number>>()
  })

  it("either", () => {
    expect(Int.either(_number)).type.toBe<Either.Either<Int.Int, Brand.Brand.BrandErrors>>()
    expect(Int.either(_number)).type.toBeAssignableTo<Either.Either<number, Brand.Brand.BrandErrors>>()
  })

  it("empty", () => {
    expect(Int.empty).type.toBe<Int.Int>()
    expect(Int.empty).type.toBeAssignableTo<number>()
  })

  it("unit", () => {
    expect(Int.unit).type.toBe<Int.Int>()
    expect(Int.unit).type.toBeAssignableTo<number>()
  })

  it("isInt", () => {
    const value: unknown = 42
    expect(value).type.not.toBeAssignableTo<Int.Int>()

    if (Int.isInt(value)) {
      expect(value).type.toBe<Int.Int>()
      expect(value).type.toBeAssignableWith<Int.Int>()
    }

    // Type guard should properly narrow union types
    const numOrString: number | string = 123
    expect(numOrString).type.not.toBeAssignableTo<Int.Int>()
    if (Int.isInt(numOrString)) {
      expect(numOrString).type.toBeAssignableTo<Int.Int>()
      expect<string>().type.not.toBeAssignableTo<typeof numOrString>()
    }
  })

  it("sum", () => {
    const dataLast = Int.sum(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.sum

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Int
    expect(Int.sum(a, b)).type.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.sum(b))).type.toBeAssignableTo<Int.Int>()
  })

  it("subtract", () => {
    const dataLast = Int.subtract(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.subtract

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Int
    expect(Int.subtract(a, b)).type.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.subtract(b))).type.toBeAssignableTo<Int.Int>()
  })

  it("multiply", () => {
    const dataLast = Int.multiply(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.multiply

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Int
    expect(Int.multiply(a, b)).type.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.multiply(b))).type.toBeAssignableTo<Int.Int>()
  })

  it("divide", () => {
    const dataLast = Int.divide(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.divide

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type: division for the set of Int is not total;
    expect(Int.divide(a, b)).type.not.toBeAssignableTo<Option.Option<Int.Int>>()
    expect(pipe(a, Int.divide(b))).type.toBeAssignableTo<Option.Option<number>>()
  })

  it("unsafeDivide", () => {
    const dataLast = Int.unsafeDivide(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.unsafeDivide

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type: division for the set of Int is not total;
    expect(Int.unsafeDivide(a, b)).type.not.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.unsafeDivide(b))).type.toBeAssignableTo<number>()
  })

  it("increment", () => {
    type DataFirst = typeof Int.increment

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Int
    expect(Int.increment(a)).type.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.increment)).type.toBeAssignableTo<Int.Int>()
  })

  it("decrement", () => {
    type DataFirst = typeof Int.decrement

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type still in the set of Int
    expect(Int.decrement(a)).type.toBeAssignableTo<Int.Int>()
    expect(pipe(a, Int.decrement)).type.toBeAssignableTo<Int.Int>()
  })

  it("Equivalence", () => {
    type DataFirst = typeof Int.Equivalence

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    // test the output type
    expect(Int.Equivalence(a, b)).type.toBeAssignableTo<boolean>()
  })

  it("Order", () => {
    type DataFirst = typeof Int.Order

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    // test the output type
    expect(Int.Order(a, b)).type.toBeAssignableTo<-1 | 0 | 1>()
  })

  it("lessThan", () => {
    const dataLast = Int.lessThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.lessThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.lessThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Int.lessThan(b))).type.toBe<boolean>()
  })

  it("lessThanOrEqualTo", () => {
    const dataLast = Int.lessThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.lessThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.lessThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Int.lessThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("greaterThan", () => {
    const dataLast = Int.greaterThan(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.greaterThan

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.greaterThan(a, b)).type.toBe<boolean>()
    expect(pipe(a, Int.greaterThan(b))).type.toBe<boolean>()
  })

  it("greaterThanOrEqualTo", () => {
    const dataLast = Int.greaterThanOrEqualTo(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.greaterThanOrEqualTo

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.greaterThanOrEqualTo(a, b)).type.toBe<boolean>()
    expect(pipe(a, Int.greaterThanOrEqualTo(b))).type.toBe<boolean>()
  })

  it("between", () => {
    const options = { minimum: a, maximum: b }
    const dataLast = Int.between(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.between

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, { minimum: Int.Int; maximum: Int.Int }]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, { minimum: number; maximum: number }]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.between(a, options)).type.toBe<boolean>()
    expect(pipe(a, Int.between(options))).type.toBe<boolean>()
  })

  it("clamp", () => {
    const options = { minimum: a, maximum: b }
    const dataLast = Int.clamp(options)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.clamp

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, { minimum: Int.Int; maximum: Int.Int }]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, { minimum: number; maximum: number }]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.clamp(a, options)).type.toBe<Int.Int>()
    expect(pipe(a, Int.clamp(options))).type.not.toBeAssignableWith<number>()
  })

  it("min", () => {
    const dataLast = Int.min(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.min

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.min(a, b)).type.toBe<Int.Int>()
    expect(pipe(a, Int.min(b))).type.not.toBeAssignableWith<number>()
  })

  it("max", () => {
    const dataLast = Int.max(a)
    type DataLast = typeof dataLast
    type DataFirst = typeof Int.max

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int, Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number, number]>()

    expect<Parameters<DataLast>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.max(a, b)).type.toBe<Int.Int>()
    expect(pipe(a, Int.max(b))).type.not.toBeAssignableWith<number>()
  })

  it("sign", () => {
    type DataFirst = typeof Int.sign

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Int.Int]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()

    // test the output type
    expect(Int.sign(a)).type.toBe<-1 | 0 | 1>()
  })

  it("sumAll", () => {
    type DataFirst = typeof Int.sumAll

    // test the input type
    expect<Parameters<DataFirst>>().type.toBeAssignableWith<[Iterable<Int.Int>]>()
    expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[Iterable<number>]>()

    // test the output type
    expect(Int.sumAll(Array.of(a, b, a, b, a, b))).type.toBe<Int.Int>()
    expect(Int.sumAll(HashSet.make(a, b, a, b, a, b))).type.not.toBeAssignableWith<number>()
  })

  it.todo("multiplyAll", () => {})
  it.todo("remainder", () => {})
  it.todo("nextPow2", () => {})
})
