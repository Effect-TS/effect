import type { Brand, Either, Option } from "effect"
import { Int, pipe } from "effect"
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

  it.todo("increment", () => {})
  it.todo("decrement", () => {})
  it.todo("Equivalence", () => {})
  it.todo("Order", () => {})
  it.todo("lessThan", () => {})
  it.todo("lessThanOrEqualTo", () => {})
  it.todo("greaterThan", () => {})
  it.todo("greaterThanOrEqualTo", () => {})
  it.todo("between", () => {})
  it.todo("clamp", () => {})
  it.todo("min", () => {})
  it.todo("max", () => {})
  it.todo("sign", () => {})
  it.todo("sumAll", () => {})
  it.todo("multiplyAll", () => {})
  it.todo("remainder", () => {})
  it.todo("nextPow2", () => {})
})
