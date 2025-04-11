import type { Brand, Either, Option } from "effect"
import { pipe } from "effect"
import type * as Integer from "effect/Integer"
import * as NaturalNumber from "effect/NaturalNumber"
import { describe, expect, it } from "tstyche"

const _number: number = 1_000_000

describe("NaturalNumber", () => {
  const a = NaturalNumber.of(10)
  const b = NaturalNumber.of(5)

  describe("Constructors", () => {
    it("of", () => {
      expect(NaturalNumber.of(_number)).type.toBe<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.of(_number)).type.toBeAssignableTo<number>()
    })

    it("zero", () => {
      expect(NaturalNumber.zero).type.toBe<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.zero).type.toBeAssignableTo<number>()
    })

    it("one", () => {
      expect(NaturalNumber.one).type.toBe<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.one).type.toBeAssignableTo<number>()
    })

    it("option", () => {
      expect(NaturalNumber.option(_number)).type.toBe<
        Option.Option<NaturalNumber.NaturalNumber>
      >()
      expect(NaturalNumber.option(_number)).type.toBeAssignableTo<
        Option.Option<number>
      >()
    })

    it("either", () => {
      expect(NaturalNumber.either(_number)).type.toBe<
        Either.Either<NaturalNumber.NaturalNumber, Brand.Brand.BrandErrors>
      >()
      expect(NaturalNumber.either(_number)).type.toBeAssignableTo<
        Either.Either<number, Brand.Brand.BrandErrors>
      >()
    })
  })

  describe("Guards", () => {
    it("isNaturalNumber", () => {
      const value: unknown = 42
      expect(value).type.not.toBeAssignableTo<NaturalNumber.NaturalNumber>()

      if (NaturalNumber.isNaturalNumber(value)) {
        expect(value).type.toBe<NaturalNumber.NaturalNumber>()
        expect(value).type.toBeAssignableWith<NaturalNumber.NaturalNumber>()
      }

      // Type guard should properly narrow union types
      const numOrString: number | string = 123
      expect(
        numOrString
      ).type.not.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      if (NaturalNumber.isNaturalNumber(numOrString)) {
        expect(numOrString).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
        expect<string>().type.not.toBeAssignableTo<typeof numOrString>()
      }
    })
  })

  describe("Math", () => {
    describe("sum", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.sum

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type and return type covariance checks
        // NaturalNumber is the return type and is assignable to Integer and number
        expect(
          NaturalNumber.sum(a, b)
        ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
        expect(NaturalNumber.sum(a, b)).type.toBeAssignableTo<Integer.Integer>()
        expect(NaturalNumber.sum(a, b)).type.toBeAssignableTo<number>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.sum(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type and return type covariance checks
        // NaturalNumber is the return type and is assignable to Integer and number
        expect(
          pipe(a, NaturalNumber.sum(b))
        ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
        expect(
          pipe(a, NaturalNumber.sum(b))
        ).type.toBeAssignableTo<Integer.Integer>()
        expect(pipe(a, NaturalNumber.sum(b))).type.toBeAssignableTo<number>()
      })
    })

    describe("subtractToInteger", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.subtractToInteger

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type and return type covariance checks
        // Integer is the return type and is assignable to number
        expect(
          NaturalNumber.subtractToInteger(a, b)
        ).type.toBeAssignableTo<Integer.Integer>()
        expect(
          NaturalNumber.subtractToInteger(a, b)
        ).type.toBeAssignableTo<number>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.subtractToInteger(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type and return type covariance checks
        // Integer is the return type and is assignable to number
        expect(
          pipe(a, NaturalNumber.subtractToInteger(b))
        ).type.toBeAssignableTo<Integer.Integer>()
        expect(
          pipe(a, NaturalNumber.subtractToInteger(b))
        ).type.toBeAssignableTo<number>()
      })
    })

    describe("multiply", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.multiply

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type and return type covariance checks
        // NaturalNumber is the return type and is assignable to Integer and number
        expect(
          NaturalNumber.multiply(a, b)
        ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
        expect(
          NaturalNumber.multiply(a, b)
        ).type.toBeAssignableTo<Integer.Integer>()
        expect(NaturalNumber.multiply(a, b)).type.toBeAssignableTo<number>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.multiply(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type and return type covariance checks
        // NaturalNumber is the return type and is assignable to Integer and number
        expect(
          pipe(a, NaturalNumber.multiply(b))
        ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
        expect(
          pipe(a, NaturalNumber.multiply(b))
        ).type.toBeAssignableTo<Integer.Integer>()
        expect(
          pipe(a, NaturalNumber.multiply(b))
        ).type.toBeAssignableTo<number>()
      })
    })

    describe("divideToNumber", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.divideToNumber

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type checks
        // Division for the set of NaturalNumber is not total;
        // Return type is Option<number>, which is already the most general type
        expect(NaturalNumber.divideToNumber(a, b)).type.not.toBeAssignableTo<
          Option.Option<NaturalNumber.NaturalNumber>
        >()
        expect(NaturalNumber.divideToNumber(a, b)).type.toBeAssignableTo<
          Option.Option<number>
        >()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.divideToNumber(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type checks
        // Division for the set of NaturalNumber is not total;
        // Return type is Option<number>, which is already the most general type
        expect(pipe(a, NaturalNumber.divideToNumber(b))).type.toBeAssignableTo<
          Option.Option<number>
        >()
      })
    })

    describe("divideSafe", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.divideSafe

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type and return type covariance checks
        // Option<NaturalNumber> is the return type and is assignable to Option<Integer> and Option<number>
        expect(NaturalNumber.divideSafe(a, b)).type.toBeAssignableTo<
          Option.Option<NaturalNumber.NaturalNumber>
        >()
        expect(NaturalNumber.divideSafe(a, b)).type.toBeAssignableTo<
          Option.Option<Integer.Integer>
        >()
        expect(NaturalNumber.divideSafe(a, b)).type.toBeAssignableTo<
          Option.Option<number>
        >()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.divideSafe(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type and return type covariance checks
        // Option<NaturalNumber> is the return type and is assignable to Option<Integer> and Option<number>
        expect(pipe(a, NaturalNumber.divideSafe(b))).type.toBeAssignableTo<
          Option.Option<NaturalNumber.NaturalNumber>
        >()
        expect(pipe(a, NaturalNumber.divideSafe(b))).type.toBeAssignableTo<
          Option.Option<Integer.Integer>
        >()
        expect(pipe(a, NaturalNumber.divideSafe(b))).type.toBeAssignableTo<
          Option.Option<number>
        >()
      })
    })

    it("increment", () => {
      type DataFirst = typeof NaturalNumber.increment

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.increment(a)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        NaturalNumber.increment(a)
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.increment(a)).type.toBeAssignableTo<number>()
    })

    it("decrementToInteger", () => {
      type DataFirst = typeof NaturalNumber.decrementToInteger

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // Integer is the return type and is assignable to number
      expect(
        NaturalNumber.decrementToInteger(a)
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(
        NaturalNumber.decrementToInteger(a)
      ).type.toBeAssignableTo<number>()
    })

    it("decrementSafe", () => {
      type DataFirst = typeof NaturalNumber.decrementSafe

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // Option<NaturalNumber> is the return type and is assignable to Option<Integer> and Option<number>
      expect(NaturalNumber.decrementSafe(a)).type.toBeAssignableTo<
        Option.Option<NaturalNumber.NaturalNumber>
      >()
      expect(NaturalNumber.decrementSafe(a)).type.toBeAssignableTo<
        Option.Option<Integer.Integer>
      >()
      expect(NaturalNumber.decrementSafe(a)).type.toBeAssignableTo<
        Option.Option<number>
      >()
    })

    it("sumAll", () => {
      type DataFirst = typeof NaturalNumber.sumAll

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [Iterable<NaturalNumber.NaturalNumber>]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Iterable<number>]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Iterable<Integer.Integer>]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.sumAll(Array.of(a, b))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        NaturalNumber.sumAll(Array.of(a, b))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(
        NaturalNumber.sumAll(Array.of(a, b))
      ).type.toBeAssignableTo<number>()
    })

    it("multiplyAll", () => {
      type DataFirst = typeof NaturalNumber.multiplyAll

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [Iterable<NaturalNumber.NaturalNumber>]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Iterable<number>]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Iterable<Integer.Integer>]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.multiplyAll(Array.of(a, b))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        NaturalNumber.multiplyAll(Array.of(a, b))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(
        NaturalNumber.multiplyAll(Array.of(a, b))
      ).type.toBeAssignableTo<number>()
    })

    it("pow", () => {
      const dataLast = NaturalNumber.pow(a)
      type DataLast = typeof dataLast
      type DataFirst = typeof NaturalNumber.pow

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, number]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer, Integer.Integer]
      >()

      expect<Parameters<DataLast>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.pow(a, b)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.pow(a, b)).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.pow(a, b)).type.toBeAssignableTo<number>()

      expect(
        pipe(a, NaturalNumber.pow(b))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        pipe(a, NaturalNumber.pow(b))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(pipe(a, NaturalNumber.pow(b))).type.toBeAssignableTo<number>()
    })

    it("square", () => {
      type DataFirst = typeof NaturalNumber.square

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.square(a)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.square(a)).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.square(a)).type.toBeAssignableTo<number>()
    })

    it("cube", () => {
      type DataFirst = typeof NaturalNumber.cube

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.cube(a)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.cube(a)).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.cube(a)).type.toBeAssignableTo<number>()
    })
  })

  describe("Instances", () => {
    it("Equivalence", () => {
      type DataFirst = typeof NaturalNumber.Equivalence

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, number]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer, Integer.Integer]
      >()

      // Output type checks
      // Return type is boolean, which is already a primitive type
      expect(NaturalNumber.Equivalence(a, b)).type.toBeAssignableTo<boolean>()
    })

    it("Order", () => {
      type DataFirst = typeof NaturalNumber.Order

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, number]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer, Integer.Integer]
      >()

      // Output type checks
      // Return type is a literal union type (-1 | 0 | 1), which is already specific
      expect(NaturalNumber.Order(a, b)).type.toBeAssignableTo<-1 | 0 | 1>()
    })
  })

  describe("Predicates", () => {
    describe("lessThan", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.lessThan

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(NaturalNumber.lessThan(a, b)).type.toBe<boolean>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.lessThan(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(pipe(a, NaturalNumber.lessThan(b))).type.toBe<boolean>()
      })
    })

    describe("lessThanOrEqualTo", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.lessThanOrEqualTo

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(NaturalNumber.lessThanOrEqualTo(a, b)).type.toBe<boolean>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.lessThanOrEqualTo(a)
        type DataLast = typeof dataLast

        // Input type checks
        // NaturalNumber operations accept NaturalNumber but not number
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(pipe(a, NaturalNumber.lessThanOrEqualTo(b))).type.toBe<boolean>()
      })
    })

    describe("greaterThan", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.greaterThan

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(NaturalNumber.greaterThan(a, b)).type.toBe<boolean>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.greaterThan(a)
        type DataLast = typeof dataLast

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
          [Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(pipe(a, NaturalNumber.greaterThan(b))).type.toBe<boolean>()
      })
    })

    describe("greaterThanOrEqualTo", () => {
      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.greaterThanOrEqualTo

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, number]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [Integer.Integer, Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(NaturalNumber.greaterThanOrEqualTo(a, b)).type.toBe<boolean>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.greaterThanOrEqualTo(a)
        type DataLast = typeof dataLast

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
          [Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(
          pipe(a, NaturalNumber.greaterThanOrEqualTo(b))
        ).type.toBe<boolean>()
      })
    })

    describe("between", () => {
      const options = { minimum: a, maximum: b }

      it("data-first", () => {
        type DataFirst = typeof NaturalNumber.between

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataFirst>>().type.toBeAssignableWith<
          [
            NaturalNumber.NaturalNumber,
            {
              minimum: NaturalNumber.NaturalNumber
              maximum: NaturalNumber.NaturalNumber
            }
          ]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [number, { minimum: number; maximum: number }]
        >()
        expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
          [
            Integer.Integer,
            { minimum: Integer.Integer; maximum: Integer.Integer }
          ]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(NaturalNumber.between(a, options)).type.toBe<boolean>()
      })

      it("data-last", () => {
        const dataLast = NaturalNumber.between(options)
        type DataLast = typeof dataLast

        // Input type and parameter contravariance checks
        // NaturalNumber operations accept NaturalNumber but not number or Integer
        expect<Parameters<DataLast>>().type.toBeAssignableWith<
          [NaturalNumber.NaturalNumber]
        >()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
        expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
          [Integer.Integer]
        >()

        // Output type checks
        // Return type is boolean, which is already a primitive type
        expect(pipe(a, NaturalNumber.between(options))).type.toBe<boolean>()
      })
    })
  })

  describe("clamp", () => {
    const options = { minimum: a, maximum: b }

    it("data-first", () => {
      type DataFirst = typeof NaturalNumber.clamp

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [
          NaturalNumber.NaturalNumber,
          {
            minimum: NaturalNumber.NaturalNumber
            maximum: NaturalNumber.NaturalNumber
          }
        ]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, { minimum: number; maximum: number }]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [
          Integer.Integer,
          { minimum: Integer.Integer; maximum: Integer.Integer }
        ]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.clamp(a, options)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        NaturalNumber.clamp(a, options)
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.clamp(a, options)).type.toBeAssignableTo<number>()
    })

    it("data-last", () => {
      const dataLast = NaturalNumber.clamp(options)
      type DataLast = typeof dataLast

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataLast>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        pipe(a, NaturalNumber.clamp(options))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        pipe(a, NaturalNumber.clamp(options))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(
        pipe(a, NaturalNumber.clamp(options))
      ).type.toBeAssignableTo<number>()
    })
  })

  describe("min", () => {
    it("data-first", () => {
      type DataFirst = typeof NaturalNumber.min

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, number]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer, Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.min(a, b)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.min(a, b)).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.min(a, b)).type.toBeAssignableTo<number>()
    })

    it("data-last", () => {
      const dataLast = NaturalNumber.min(a)
      type DataLast = typeof dataLast

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataLast>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        pipe(a, NaturalNumber.min(b))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        pipe(a, NaturalNumber.min(b))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(pipe(a, NaturalNumber.min(b))).type.toBeAssignableTo<number>()
    })
  })

  describe("max", () => {
    it("data-first", () => {
      type DataFirst = typeof NaturalNumber.max

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataFirst>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber, NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [number, number]
      >()
      expect<Parameters<DataFirst>>().type.not.toBeAssignableWith<
        [Integer.Integer, Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        NaturalNumber.max(a, b)
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(NaturalNumber.max(a, b)).type.toBeAssignableTo<Integer.Integer>()
      expect(NaturalNumber.max(a, b)).type.toBeAssignableTo<number>()
    })

    it("data-last", () => {
      const dataLast = NaturalNumber.max(a)
      type DataLast = typeof dataLast

      // Input type and parameter contravariance checks
      // NaturalNumber operations accept NaturalNumber but not number or Integer
      expect<Parameters<DataLast>>().type.toBeAssignableWith<
        [NaturalNumber.NaturalNumber]
      >()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<[number]>()
      expect<Parameters<DataLast>>().type.not.toBeAssignableWith<
        [Integer.Integer]
      >()

      // Output type and return type covariance checks
      // NaturalNumber is the return type and is assignable to Integer and number
      expect(
        pipe(a, NaturalNumber.max(b))
      ).type.toBeAssignableTo<NaturalNumber.NaturalNumber>()
      expect(
        pipe(a, NaturalNumber.max(b))
      ).type.toBeAssignableTo<Integer.Integer>()
      expect(pipe(a, NaturalNumber.max(b))).type.toBeAssignableTo<number>()
    })
  })
})
