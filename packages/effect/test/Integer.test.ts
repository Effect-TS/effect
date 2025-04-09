import { describe, it } from "@effect/vitest"
import { Either, HashSet, List, Number as _Number, Option, pipe } from "effect"
import * as Integer from "effect/Integer"
import { DivisionByZeroError } from "effect/internal/number"
import {
  assertEquals,
  assertFalse,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  notDeepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"

describe("Integer", () => {
  describe("Constructors", () => {
    it("of", () => {
      const float = 1.5
      const zero = 0

      strictEqual(Integer.of(zero), zero)
      throws(() => Integer.of(float))
      throws(() => Integer.of(Number.NaN))
    })

    it("option", () => {
      assertSome(Integer.option(0), Integer.of(0))
      assertSome(Integer.option(Integer.zero), Integer.zero)
      assertSome(Integer.option(-1), Integer.of(-1))

      assertNone(Integer.option(-1.5))
      assertNone(Integer.option(Number.NaN))
    })

    it("either", () => {
      // Valid integers return Right<Integer>
      assertRight(Integer.either(0), Integer.of(0))
      assertRight(Integer.either(Integer.zero), Integer.zero)
      assertRight(Integer.either(-1), Integer.of(-1))
      assertRight(
        Integer.either(Number.MAX_SAFE_INTEGER),
        Integer.of(Number.MAX_SAFE_INTEGER)
      )
      assertRight(
        Integer.either(Number.MIN_SAFE_INTEGER),
        Integer.of(Number.MIN_SAFE_INTEGER)
      )

      // Non-integers return Left<BrandErrors>
      assertTrue(Either.isLeft(Integer.either(3.14)))
      assertTrue(Either.isLeft(Integer.either(-2.5)))
      assertTrue(Either.isLeft(Integer.either(Number.NaN)))
      assertTrue(Either.isLeft(Integer.either(Number.POSITIVE_INFINITY)))
      assertTrue(Either.isLeft(Integer.either(Number.NEGATIVE_INFINITY)))

      // Error messages detail the validation failure
      const Pi = 3.14
      const floatResult = Integer.either(Pi)
      if (Either.isLeft(floatResult)) {
        pipe(
          Either.getLeft(floatResult),
          Option.match({
            onNone: () => assertFalse(true, "Should have error message"),
            onSome: ([{ message }]) => {
              strictEqual(message, `Expected (${Pi}) to be an integer`)
            }
          })
        )
      }
    })
  })

  describe("Constants", () => {
    it("zero", () => {
      strictEqual(Integer.zero, 0)
    })

    it("one", () => {
      strictEqual(Integer.one, 1)
    })
  })

  describe("Guards", () => {
    it("isInteger", () => {
      assertTrue(Integer.isInteger(1))
      assertFalse(Integer.isInteger(1.5))
      assertFalse(Integer.isInteger("a"))
      assertFalse(Integer.isInteger(true))
    })
  })

  describe("Instances", () => {
    it("Equivalence", () => {
      assertTrue(Integer.Equivalence(Integer.of(1), Integer.of(1)))
      assertFalse(Integer.Equivalence(Integer.of(1), Integer.of(2)))
    })

    it("Order", () => {
      strictEqual(Integer.Order(Integer.of(1), Integer.of(2)), -1)

      strictEqual(Integer.Order(Integer.of(-1), Integer.of(2)), -1)

      strictEqual(Integer.Order(Integer.of(-2), Integer.of(-1)), -1)

      strictEqual(Integer.Order(Integer.of(2), Integer.of(1)), 1)

      strictEqual(Integer.Order(Integer.of(2), Integer.of(-1)), 1)

      strictEqual(Integer.Order(Integer.of(-1), Integer.of(-2)), 1)

      strictEqual(Integer.Order(Integer.of(2), Integer.of(2)), 0)

      strictEqual(Integer.Order(Integer.of(-2), Integer.of(-2)), 0)
    })
  })

  describe("Math", () => {
    it("sum", () => {
      strictEqual(
        pipe(Integer.of(100), Integer.sum(Integer.of(-50))),
        Integer.of(50)
      )
      strictEqual(Integer.sum(Integer.of(-50), Integer.of(100)), Integer.of(50))

      strictEqual(
        pipe(Integer.of(100), Integer.sum(Integer.of(-50))),
        pipe(Integer.of(-50), Integer.sum(Integer.of(100))),
        "addition under Integer is `commutative`"
      )

      strictEqual(
        pipe(
          Integer.of(100),
          Integer.sum(Integer.of(-50)),
          Integer.sum(Integer.of(-50))
        ),
        pipe(
          Integer.of(-50),
          Integer.sum(Integer.of(100)),
          Integer.sum(Integer.of(-50))
        ),
        "addition under Integer is `associative`"
      )

      strictEqual(
        pipe(Integer.zero, Integer.sum(Integer.of(100))),
        Integer.of(100),
        "'zero' is the identity element for addition"
      )

      throws(
        // @ts-expect-error - can't pass a float
        () => Integer.sum(Integer.of(2), 1.5)
      )
    })

    it("subtract", () => {
      const three = Integer.of(3)
      const two = Integer.of(2)

      strictEqual(pipe(three, Integer.subtract(Integer.one)), two)
      strictEqual(pipe(Integer.one, Integer.subtract(three)), -2)

      strictEqual(Integer.subtract(three, Integer.one), two)
      strictEqual(Integer.subtract(Integer.one, three), -2)

      strictEqual(
        pipe(three, Integer.subtract(two)),
        -pipe(two, Integer.subtract(three)),
        "subtraction under Integer is anticommutative"
      )

      notDeepStrictEqual(
        pipe(three, Integer.subtract(two), Integer.subtract(Integer.one)),
        pipe(two, Integer.subtract(three), Integer.subtract(Integer.one)),
        "subtraction under Integer is not associative"
      )

      strictEqual(
        pipe(Integer.zero, Integer.subtract(three)),
        -three,
        "zero is the identity element under subtraction"
      )
    })

    //
    it("multiply", () => {
      strictEqual(pipe(Integer.of(2), Integer.multiply(Integer.of(3))), 6)
      strictEqual(Integer.multiply(Integer.of(2), Integer.of(3)), 6)

      strictEqual(Integer.multiply(Integer.of(10), Integer.of(-10)), -100)

      strictEqual(
        pipe(Integer.of(2), Integer.multiply(Integer.of(3))),
        pipe(Integer.of(3), Integer.multiply(Integer.of(2))),
        "multiplication under Integer is commutative"
      )

      strictEqual(
        pipe(
          Integer.of(2),
          Integer.multiply(Integer.of(3)),
          Integer.multiply(Integer.of(4))
        ),
        pipe(
          Integer.of(2),
          Integer.multiply(Integer.of(4)),
          Integer.multiply(Integer.of(3))
        ),
        "multiplication under Integer is associative"
      )

      strictEqual(
        Integer.multiply(Integer.of(2), Integer.one),
        Integer.of(2),
        "`1` is the identity element under multiplication"
      )

      strictEqual(
        Integer.multiply(Integer.of(2), Integer.zero),
        Integer.zero,
        "multiplication by zero"
      )
    })

    //
    it("divide", () => {
      assertSome(pipe(Integer.of(6), Integer.divide(Integer.of(2))), 3)

      notDeepStrictEqual(
        pipe(Integer.of(6), Integer.divide(Integer.of(2))),
        pipe(Integer.of(2), Integer.divide(Integer.of(6))),
        "division under Integer is not commutative"
      )

      notDeepStrictEqual(
        pipe(
          Integer.divide(Integer.of(24), Integer.of(6)), //
          Option.flatMap((n: number) => _Number.divide(n, Integer.of(2)))
        ),
        pipe(
          Integer.divide(Integer.of(6), Integer.of(2)),
          Option.flatMap(_Number.divide(Integer.of(24)))
        ),
        "division under Integer is not associative"
      )

      assertNone(pipe(Integer.of(6), Integer.divide(Integer.of(0))))
    })

    it("unsafeDivide", () => {
      const six = Integer.of(6)
      const two = Integer.of(2)

      strictEqual(
        pipe(six, Integer.unsafeDivide(two)),
        Integer.unsafeDivide(six, two)
      )

      strictEqual(pipe(six, Integer.unsafeDivide(two)), 3)
      strictEqual(pipe(six, Integer.unsafeDivide(two)), 3)

      strictEqual(Integer.unsafeDivide(Integer.zero, six), 0)
      throws(
        () => Integer.unsafeDivide(six, Integer.zero),
        DivisionByZeroError.divisionByZero(six)
      )
      throws(
        () => Integer.unsafeDivide(Integer.zero, Integer.zero),
        DivisionByZeroError.indeterminateForm()
      )
    })

    it("increment", () => {
      strictEqual(Integer.increment(Integer.of(1)), Integer.of(2))

      strictEqual(Integer.increment(Integer.of(-99)), Integer.of(-98))

      strictEqual(
        pipe(
          Integer.of(1),
          Integer.increment,
          Integer.increment,
          Integer.increment,
          Integer.increment
        ),
        Integer.of(5)
      )
    })

    it("decrement", () => {
      strictEqual(Integer.decrement(Integer.of(2)), Integer.of(1))

      strictEqual(Integer.decrement(Integer.of(-100)), Integer.of(-101))

      strictEqual(
        pipe(
          Integer.of(100),
          Integer.decrement,
          Integer.decrement,
          Integer.decrement,
          Integer.decrement
        ),
        Integer.of(96)
      )
    })

    it("sign", () => {
      strictEqual(Integer.sign(Integer.of(-10)), -1)

      strictEqual(Integer.sign(Integer.of(0)), 0)

      strictEqual(
        Integer.sign(Integer.of(-0)),
        0,
        "Sign of negative zero should be zero"
      )

      strictEqual(Integer.sign(Integer.of(10)), 1)
    })

    it("sumAll", () => {
      // Array of Integer
      strictEqual<Integer.Integer>(
        Integer.sumAll([Integer.of(2), Integer.of(3), Integer.of(4)]),
        Integer.of(9),
        "Array of Integer should sum correctly"
      )

      // HashSet of Integer
      const hashSet = HashSet.make(Integer.of(2), Integer.of(3), Integer.of(4))
      strictEqual(
        Integer.sumAll(hashSet),
        9,
        "HashSet of Integer should sum correctly"
      )

      // List of Integer
      const list = List.make(Integer.of(2), Integer.of(3), Integer.of(4))
      strictEqual(
        Integer.sumAll(list),
        Integer.of(9),
        "List of Integer should sum correctly"
      )

      // Generator function yielding Integer
      function* intGenerator(): Generator<Integer.Integer, void, never> {
        const intBatch = [
          Integer.of(2),
          Integer.of(3),
          Integer.of(4),
          Integer.of(-4),
          Integer.of(-3),
          Integer.of(7)
        ]
        for (const int of intBatch) {
          yield int
        }
      }

      strictEqual(
        Integer.sumAll(intGenerator()),
        Integer.of(9),
        "Generator of Integer should sum correctly"
      )

      // Set of Integer (standard JavaScript Set)
      const set = new Set<Integer.Integer>([
        Integer.of(2),
        Integer.of(3),
        Integer.of(4)
      ])
      strictEqual(
        Integer.sumAll(set),
        Integer.of(9),
        "Set of Integer should sum correctly"
      )
    })

    it("multiplyAll", () => {
      strictEqual(
        Integer.multiplyAll(
          Array.of(Integer.of(2), Integer.zero, Integer.of(4))
        ),
        Integer.zero
      )

      strictEqual(
        Integer.multiplyAll(
          HashSet.make(Integer.of(-2), Integer.of(-3), Integer.of(4))
        ),
        Integer.of(24)
      )

      strictEqual(
        Integer.multiplyAll(
          Array.of(Integer.of(-2), Integer.of(3), Integer.of(4))
        ),
        Integer.of(-24)
      )

      strictEqual(
        Integer.multiplyAll(
          List.make(Integer.of(-3), Integer.of(-2), Integer.of(4))
        ),
        Integer.of(24)
      )
    })

    it("remainder", () => {
      strictEqual(Integer.remainder(Integer.of(2), Integer.of(2)), 0)
      strictEqual(Integer.remainder(Integer.of(3), Integer.of(2)), 1)
      strictEqual(Integer.remainder(Integer.of(4), Integer.of(2)), 0)
      strictEqual(Integer.remainder(Integer.of(-2), Integer.of(2)), -0)
      strictEqual(Integer.remainder(Integer.of(-3), Integer.of(2)), -1)
      strictEqual(Integer.remainder(Integer.of(-4), Integer.of(2)), -0)
    })

    it("nextPow2", () => {
      strictEqual(Integer.nextPow2(Integer.of(5)), Integer.of(8))

      strictEqual(Integer.nextPow2(Integer.of(17)), Integer.of(32))

      strictEqual(
        Integer.nextPow2(Integer.of(0)),
        Integer.of(2),
        "nextPow2 of 0 should be 2"
      )

      strictEqual(
        Integer.nextPow2(Integer.of(8)),
        Integer.of(8),
        "nextPow2 of a power of 2 should be the same number"
      )

      strictEqual(
        Integer.nextPow2(Integer.of(16)),
        Integer.of(16),
        "nextPow2 of a power of 2 should be the same number"
      )
    })
  })

  describe("Predicates", () => {
    //
    it("lessThan", () => {
      assertTrue(Integer.lessThan(Integer.of(2), Integer.of(3)))

      assertFalse(
        pipe(
          Integer.of(3), //
          Integer.lessThan(Integer.of(3))
        )
      )

      assertFalse(
        pipe(
          Integer.of(4), //
          Integer.lessThan(Integer.of(3))
        )
      )
    })

    it("lessThanOrEqualTo", () => {
      const negativeTwo = Integer.of(-2)
      const three = Integer.of(3)
      const four = Integer.of(4)

      const isNegativeTwoLessThenOrEqualToThree = Integer.lessThanOrEqualTo(
        negativeTwo,
        three
      )

      assertTrue(isNegativeTwoLessThenOrEqualToThree)

      assertEquals(
        isNegativeTwoLessThenOrEqualToThree,
        pipe(
          negativeTwo, //
          Integer.lessThanOrEqualTo(three)
        )
      )

      const isThreeLessThenOrEqualToThree = Integer.lessThanOrEqualTo(
        three,
        three
      )

      assertTrue(isThreeLessThenOrEqualToThree)

      assertEquals(
        isThreeLessThenOrEqualToThree,
        pipe(
          three, //
          Integer.lessThanOrEqualTo(three)
        )
      )

      const isFourLessThanOrEqualThree = Integer.lessThanOrEqualTo(four, three)
      assertFalse(isFourLessThanOrEqualThree)

      assertEquals(
        isFourLessThanOrEqualThree,
        pipe(
          four, //
          Integer.lessThanOrEqualTo(three)
        )
      )
    })

    it("greaterThan", () => {
      const negativeTwo = Integer.of(-2)
      const three = Integer.of(3)
      const four = Integer.of(4)

      const isNegativeTwoGreaterThree = Integer.greaterThan(negativeTwo, three)
      assertFalse(isNegativeTwoGreaterThree)
      assertEquals(
        isNegativeTwoGreaterThree,
        pipe(
          negativeTwo, //
          Integer.greaterThan(three)
        )
      )

      assertFalse(Integer.greaterThan(Integer.zero, Integer.zero))

      const isNegativeTwoGreaterThanNegativeTwo = Integer.greaterThan(
        negativeTwo,
        negativeTwo
      )
      assertFalse(isNegativeTwoGreaterThanNegativeTwo)
      assertEquals(
        isNegativeTwoGreaterThanNegativeTwo,
        pipe(
          negativeTwo, //
          Integer.greaterThan(negativeTwo)
        )
      )

      const isFourGreaterThanNegativeTwo = Integer.greaterThan(
        four,
        negativeTwo
      )
      assertTrue(isFourGreaterThanNegativeTwo)
      assertEquals(
        isFourGreaterThanNegativeTwo,
        pipe(
          four, //
          Integer.greaterThan(negativeTwo)
        )
      )
    })

    it("greaterThanOrEqualTo", () => {
      const negativeTwo = Integer.of(-2)
      const three = Integer.of(3)
      const four = Integer.of(4)

      const isNegativeTwoGreaterOrEqualToThree = Integer.greaterThanOrEqualTo(
        negativeTwo,
        three
      )
      assertFalse(isNegativeTwoGreaterOrEqualToThree)
      assertEquals(
        isNegativeTwoGreaterOrEqualToThree,
        pipe(
          negativeTwo, //
          Integer.greaterThanOrEqualTo(three)
        )
      )

      const isZeroGreaterThanOrEqualToZero = Integer.greaterThanOrEqualTo(
        Integer.zero,
        Integer.zero
      )
      assertTrue(isZeroGreaterThanOrEqualToZero)
      assertEquals(
        isZeroGreaterThanOrEqualToZero,
        pipe(
          Integer.zero, //
          Integer.greaterThanOrEqualTo(Integer.zero)
        )
      )

      assertTrue(
        Integer.greaterThanOrEqualTo(Integer.zero, Integer.of(-Integer.zero))
      )

      const isFourGreaterThanOrEqualToNegativeTwo = Integer.greaterThanOrEqualTo(four, negativeTwo)
      assertTrue(isFourGreaterThanOrEqualToNegativeTwo)
      assertEquals(
        isFourGreaterThanOrEqualToNegativeTwo,
        pipe(four, Integer.greaterThanOrEqualTo(negativeTwo))
      )
    })

    it("between", () => {
      const options = {
        minimum: Integer.of(0),
        maximum: Integer.of(5)
      } as const

      const isThreeBetweenZeroAndFive = Integer.between(Integer.of(3), options)

      assertTrue(
        isThreeBetweenZeroAndFive,
        "Value is between minimum and maximum"
      )
      assertEquals(
        isThreeBetweenZeroAndFive,
        pipe(Integer.of(3), Integer.between(options))
      )

      const isZeroBetweenZeroAndFive = Integer.between(Integer.of(0), options)

      assertTrue(
        isZeroBetweenZeroAndFive,
        "The lower bound of the range is inclusive"
      )
      assertEquals(
        isZeroBetweenZeroAndFive,
        pipe(Integer.of(0), Integer.between(options))
      )

      const isFiveBetweenZeroAndFive = Integer.between(Integer.of(5), options)

      assertTrue(
        isFiveBetweenZeroAndFive,
        "The higher bound of the range is inclusive"
      )
      assertEquals(
        isFiveBetweenZeroAndFive,
        pipe(Integer.of(5), Integer.between(options))
      )

      const isMinusOneBetweenZeroAndFive = Integer.between(
        Integer.of(-1),
        options
      )

      assertFalse(
        isMinusOneBetweenZeroAndFive,
        "Value is out of the lower bound defined by the range"
      )
      assertEquals(
        isMinusOneBetweenZeroAndFive,
        pipe(Integer.of(-1), Integer.between(options))
      )

      const isSixBetweenZeroAndFive = Integer.between(Integer.of(6), options)

      assertFalse(
        isSixBetweenZeroAndFive,
        "Value is out of the higher bound defined by the range"
      )
      assertEquals(
        isSixBetweenZeroAndFive,
        pipe(Integer.of(6), Integer.between(options))
      )

      assertTrue(
        Integer.between(Integer.of(0), {
          minimum: Integer.of(0),
          maximum: Integer.of(0)
        }),
        "The value is equal to both minimum and maximum bounds of the range"
      )

      assertTrue(
        Integer.between(Integer.of(0), {
          minimum: Integer.of(-Integer.zero),
          maximum: Integer.zero
        })
      )
    })
  })

  it("clamp", () => {
    const clampOptions = {
      minimum: Integer.zero,
      maximum: Integer.of(5)
    } as const
    const clampBetweenZeroAndFive: (n: Integer.Integer) => Integer.Integer = Integer.clamp(clampOptions)

    // Test value within range
    const valueWithinRange = Integer.clamp(Integer.of(3), clampOptions)
    strictEqual(
      valueWithinRange,
      Integer.of(3),
      "Value within range should remain unchanged"
    )
    assertEquals(valueWithinRange, pipe(Integer.of(3), clampBetweenZeroAndFive))

    // Test minimum boundary value (inclusive)
    const minBoundaryValue = Integer.clamp(Integer.of(0), clampOptions)
    strictEqual(
      minBoundaryValue,
      Integer.of(0),
      "Minimum boundary value should remain unchanged (inclusive)"
    )
    assertEquals(minBoundaryValue, pipe(Integer.of(0), clampBetweenZeroAndFive))

    // Test maximum boundary value (inclusive)
    const maxBoundaryValue = Integer.clamp(Integer.of(5), clampOptions)
    strictEqual(
      maxBoundaryValue,
      Integer.of(5),
      "Maximum boundary value should remain unchanged (inclusive)"
    )
    assertEquals(maxBoundaryValue, pipe(Integer.of(5), clampBetweenZeroAndFive))

    // Test value below minimum
    const valueBelowMin = Integer.clamp(Integer.of(-1), clampOptions)
    strictEqual(
      valueBelowMin,
      Integer.of(0),
      "Value below minimum should be clamped to minimum"
    )
    assertEquals(valueBelowMin, pipe(Integer.of(-1), clampBetweenZeroAndFive))

    // Test value above maximum
    const valueAboveMax = Integer.clamp(Integer.of(6), clampOptions)
    strictEqual(
      valueAboveMax,
      Integer.of(5),
      "Value above maximum should be clamped to maximum"
    )
    assertEquals(valueAboveMax, pipe(Integer.of(6), clampBetweenZeroAndFive))
  })

  it("min", () => {
    const two = Integer.of(2)
    const three = Integer.of(3)
    const negativeTwo = Integer.of(-2)

    // case: first value is smaller
    const firstValueSmaller = Integer.min(two, three)
    strictEqual(
      firstValueSmaller,
      two,
      "When first value is smaller, it should be returned"
    )
    assertEquals(firstValueSmaller, pipe(two, Integer.min(three)))

    // case: second value is smaller
    const secondValueSmaller = Integer.min(three, two)
    strictEqual(
      secondValueSmaller,
      two,
      "When second value is smaller, it should be returned"
    )
    assertEquals(secondValueSmaller, pipe(three, Integer.min(two)))

    // case: equal values
    const equalValues = Integer.min(two, two)
    strictEqual(
      equalValues,
      two,
      "When values are equal, either can be returned"
    )
    assertEquals(equalValues, pipe(two, Integer.min(two)))

    // case: negative value is smaller
    const negativeValueSmaller = Integer.min(negativeTwo, two)
    strictEqual(
      negativeValueSmaller,
      negativeTwo,
      "When comparing positive and negative values, the smaller one should be returned"
    )
    assertEquals(negativeValueSmaller, pipe(negativeTwo, Integer.min(two)))
  })

  it("max", () => {
    const two = Integer.of(2)
    const three = Integer.of(3)
    const negativeTwo = Integer.of(-2)

    // case: first value is larger
    const firstValueLarger = Integer.max(three, two)
    strictEqual(
      firstValueLarger,
      three,
      "When first value is larger, it should be returned"
    )
    assertEquals(firstValueLarger, pipe(three, Integer.max(two)))

    // case: second value is larger
    const secondValueLarger = Integer.max(two, three)
    strictEqual(
      secondValueLarger,
      three,
      "When second value is larger, it should be returned"
    )
    assertEquals(secondValueLarger, pipe(two, Integer.max(three)))

    // case: equal values
    const equalValues = Integer.max(two, two)
    strictEqual(
      equalValues,
      two,
      "When values are equal, either can be returned"
    )
    assertEquals(equalValues, pipe(two, Integer.max(two)))

    // case: positive value is larger
    const positiveValueLarger = Integer.max(negativeTwo, two)
    strictEqual(
      positiveValueLarger,
      two,
      "When comparing positive and negative values, the larger one should be returned"
    )
    assertEquals(positiveValueLarger, pipe(negativeTwo, Integer.max(two)))
  })

  it.skip("scratchpad", () => {})
})
