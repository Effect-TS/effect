import { describe, it } from "@effect/vitest"
import { Either, Int, Number as _Number, Option, pipe } from "effect"
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

describe("Int", () => {
  it("of", () => {
    const float = 1.5
    const zero = 0

    strictEqual(Int.of(zero), zero)
    throws(() => Int.of(float))
    throws(() => Int.of(Number.NaN))
  })

  it("option", () => {
    assertSome(Int.option(0), Int.of(0))
    assertSome(Int.option(Int.empty), Int.empty)
    assertSome(Int.option(-1), Int.of(-1))

    assertNone(Int.option(-1.5))
    assertNone(Int.option(Number.NaN))
  })

  it("either", () => {
    // Valid integers return Right<Int>
    assertRight(Int.either(0), Int.of(0))
    assertRight(Int.either(Int.empty), Int.empty)
    assertRight(Int.either(-1), Int.of(-1))
    assertRight(
      Int.either(Number.MAX_SAFE_INTEGER),
      Int.of(Number.MAX_SAFE_INTEGER)
    )
    assertRight(
      Int.either(Number.MIN_SAFE_INTEGER),
      Int.of(Number.MIN_SAFE_INTEGER)
    )

    // Non-integers return Left<BrandErrors>
    assertTrue(Either.isLeft(Int.either(3.14)))
    assertTrue(Either.isLeft(Int.either(-2.5)))
    assertTrue(Either.isLeft(Int.either(Number.NaN)))
    assertTrue(Either.isLeft(Int.either(Number.POSITIVE_INFINITY)))
    assertTrue(Either.isLeft(Int.either(Number.NEGATIVE_INFINITY)))

    // Error messages detail the validation failure
    const Pi = 3.14
    const floatResult = Int.either(Pi)
    if (Either.isLeft(floatResult)) {
      pipe(
        Either.getLeft(floatResult),
        Option.match({
          onNone: () => assertFalse(true, "Should have error message"),
          onSome: ([{ message }]) => {
            strictEqual(message, `Expected ${Pi} to be an integer`)
          }
        })
      )
    }
  })

  it("empty", () => {
    strictEqual(Int.empty, 0)
  })

  it("isInt", () => {
    assertTrue(Int.isInt(1))
    assertFalse(Int.isInt(1.5))
    assertFalse(Int.isInt("a"))
    assertFalse(Int.isInt(true))
  })

  it("sum", () => {
    strictEqual(pipe(Int.of(100), Int.sum(Int.of(-50))), Int.of(50))
    strictEqual(Int.sum(Int.of(-50), Int.of(100)), Int.of(50))

    strictEqual(
      pipe(Int.of(100), Int.sum(Int.of(-50))),
      pipe(Int.of(-50), Int.sum(Int.of(100))),
      "addition under Int is `commutative`" // Doha !
    )

    strictEqual(
      pipe(Int.of(100), Int.sum(Int.of(-50)), Int.sum(Int.of(-50))),
      pipe(Int.of(-50), Int.sum(Int.of(100)), Int.sum(Int.of(-50))),
      "addition under Int is `associative`" // Doha !
    )

    strictEqual(
      pipe(Int.empty, Int.sum(Int.of(100))),
      Int.of(100),
      "'zeo' is the identity element for addition"
    ) // Doha !

    throws(
      // @ts-expect-error - can't pass a float
      () => Int.sum(Int.of(2), 1.5)
    )
  })

  it("subtract", () => {
    const three = Int.of(3)
    const two = Int.of(2)

    strictEqual(pipe(three, Int.subtract(Int.unit)), two)
    strictEqual(pipe(Int.unit, Int.subtract(three)), -2)

    strictEqual(Int.subtract(three, Int.unit), two)
    strictEqual(Int.subtract(Int.unit, three), -2)

    strictEqual(
      pipe(three, Int.subtract(two)),
      -pipe(two, Int.subtract(three)),
      "subtraction under Int is anticommutative" // Doha !
    )

    notDeepStrictEqual(
      pipe(three, Int.subtract(two), Int.subtract(Int.unit)),
      pipe(two, Int.subtract(three), Int.subtract(Int.unit)),
      "subtraction under Int is not associative" // Doha !
    )

    strictEqual(
      pipe(Int.empty, Int.subtract(three)),
      -three,
      "zero is the identity element under subtraction"
    )
  })

  it("multiply", () => {
    strictEqual(pipe(Int.of(2), Int.multiply(Int.of(3))), 6)
    strictEqual(Int.multiply(Int.of(2), Int.of(3)), 6)

    strictEqual(Int.multiply(Int.of(10), Int.of(-10)), -100)

    strictEqual(
      pipe(Int.of(2), Int.multiply(Int.of(3))),
      pipe(Int.of(3), Int.multiply(Int.of(2))),
      "multiplication under Int is commutative" // Doha !
    )

    strictEqual(
      pipe(Int.of(2), Int.multiply(Int.of(3)), Int.multiply(Int.of(4))),
      pipe(Int.of(2), Int.multiply(Int.of(4)), Int.multiply(Int.of(3))),
      "multiplication under Int is associative" // Doha !
    )

    strictEqual(
      Int.multiply(Int.of(2), Int.unit),
      Int.of(2),
      "`1` is the identity element under multiplication" /* Doha ! */
    )

    strictEqual(
      Int.multiply(Int.of(2), Int.empty),
      Int.empty,
      "multiplication by zero" /* Doha ! */
    )
  })

  it("divide", () => {
    assertSome(pipe(Int.of(6), Int.divide(Int.of(2))), 3)

    notDeepStrictEqual(
      pipe(Int.of(6), Int.divide(Int.of(2))),
      pipe(Int.of(2), Int.divide(Int.of(6))),
      "division under Int is not commutative" // Doha !
    )

    notDeepStrictEqual(
      pipe(
        Int.divide(Int.of(24), Int.of(6)), //
        Option.flatMap((n: number) => _Number.divide(n, Int.of(2)))
      ),
      pipe(
        Int.divide(Int.of(6), Int.of(2)),
        Option.flatMap(_Number.divide(Int.of(24)))
      ),
      "division under Int is not associative" // Doha !
    )

    assertNone(pipe(Int.of(6), Int.divide(Int.of(0))))
  })

  it("unsafeDivide", () => {
    const six = Int.of(6)
    const two = Int.of(2)

    strictEqual(pipe(six, Int.unsafeDivide(two)), Int.unsafeDivide(six, two))

    strictEqual(pipe(six, Int.unsafeDivide(two)), 3)
    strictEqual(pipe(six, Int.unsafeDivide(two)), 3)

    strictEqual(Int.unsafeDivide(Int.empty, six), 0)
    throws(
      () => Int.unsafeDivide(six, Int.empty),
      Int.IntegerDivisionError.divisionByZero(six)
    )
    throws(
      () => Int.unsafeDivide(Int.empty, Int.empty),
      Int.IntegerDivisionError.indeterminateForm()
    )
  })

  it("increment", () => {
    strictEqual(Int.increment(Int.of(1)), Int.of(2))

    strictEqual(Int.increment(Int.of(-99)), Int.of(-98))

    strictEqual(
      pipe(
        Int.of(1),
        Int.increment,
        Int.increment,
        Int.increment,
        Int.increment
      ),
      Int.of(5)
    )
  })

  it("decrement", () => {
    strictEqual(Int.decrement(Int.of(2)), Int.of(1))

    strictEqual(Int.decrement(Int.of(-100)), Int.of(-101))

    strictEqual(
      pipe(
        Int.of(100),
        Int.decrement,
        Int.decrement,
        Int.decrement,
        Int.decrement
      ),
      Int.of(96)
    )
  })

  it("Equivalence", () => {
    assertTrue(Int.Equivalence(Int.of(1), Int.of(1)))
    assertFalse(Int.Equivalence(Int.of(1), Int.of(2)))
  })

  it("Order", () => {
    strictEqual(Int.Order(Int.of(1), Int.of(2)), -1)

    strictEqual(Int.Order(Int.of(-1), Int.of(2)), -1)

    strictEqual(Int.Order(Int.of(-2), Int.of(-1)), -1)

    strictEqual(Int.Order(Int.of(2), Int.of(1)), 1)

    strictEqual(Int.Order(Int.of(2), Int.of(-1)), 1)

    strictEqual(Int.Order(Int.of(-1), Int.of(-2)), 1)

    strictEqual(Int.Order(Int.of(2), Int.of(2)), 0)

    strictEqual(Int.Order(Int.of(-2), Int.of(-2)), 0)
  })

  it("lessThan", () => {
    assertTrue(Int.lessThan(Int.of(2), Int.of(3)))

    assertFalse(
      pipe(
        Int.of(3), //
        Int.lessThan(Int.of(3))
      )
    )

    assertFalse(
      pipe(
        Int.of(4), //
        Int.lessThan(Int.of(3))
      )
    )
  })

  it("lessThanOrEqualTo", () => {
    const negativeTwo = Int.of(-2)
    const three = Int.of(3)
    const four = Int.of(4)

    const isNegativeTwoLessThenOrEqualToThree = Int.lessThanOrEqualTo(
      negativeTwo,
      three
    )

    assertTrue(isNegativeTwoLessThenOrEqualToThree)

    assertEquals(
      isNegativeTwoLessThenOrEqualToThree,
      pipe(
        negativeTwo, //
        Int.lessThanOrEqualTo(three)
      )
    )

    const isThreeLessThenOrEqualToThree = Int.lessThanOrEqualTo(three, three)

    assertTrue(isThreeLessThenOrEqualToThree)

    assertEquals(
      isThreeLessThenOrEqualToThree,
      pipe(
        three, //
        Int.lessThanOrEqualTo(three)
      )
    )

    const isFourLessThanOrEqualThree = Int.lessThanOrEqualTo(four, three)
    assertFalse(isFourLessThanOrEqualThree)

    assertEquals(
      isFourLessThanOrEqualThree,
      pipe(
        four, //
        Int.lessThanOrEqualTo(three)
      )
    )
  })

  it("greaterThan", () => {
    const negativeTwo = Int.of(-2)
    const three = Int.of(3)
    const four = Int.of(4)

    const isNegativeTwoGreaterThree = Int.greaterThan(negativeTwo, three)
    assertFalse(isNegativeTwoGreaterThree)
    assertEquals(
      isNegativeTwoGreaterThree,
      pipe(
        negativeTwo, //
        Int.greaterThan(three)
      )
    )

    assertFalse(Int.greaterThan(Int.empty, Int.empty))

    const isNegativeTwoGreaterThanNegativeTwo = Int.greaterThan(
      negativeTwo,
      negativeTwo
    )
    assertFalse(isNegativeTwoGreaterThanNegativeTwo)
    assertEquals(
      isNegativeTwoGreaterThanNegativeTwo,
      pipe(
        negativeTwo, //
        Int.greaterThan(negativeTwo)
      )
    )

    const isFourGreaterThanNegativeTwo = Int.greaterThan(four, negativeTwo)
    assertTrue(isFourGreaterThanNegativeTwo)
    assertEquals(
      isFourGreaterThanNegativeTwo,
      pipe(
        four, //
        Int.greaterThan(negativeTwo)
      )
    )
  })

  it("greaterThanOrEqualTo", () => {
    const negativeTwo = Int.of(-2)
    const three = Int.of(3)
    const four = Int.of(4)

    const isNegativeTwoGreaterOrEqualToThree = Int.greaterThanOrEqualTo(
      negativeTwo,
      three
    )
    assertFalse(isNegativeTwoGreaterOrEqualToThree)
    assertEquals(
      isNegativeTwoGreaterOrEqualToThree,
      pipe(
        negativeTwo, //
        Int.greaterThanOrEqualTo(three)
      )
    )

    const isZeroGreaterThanOrEqualToZero = Int.greaterThanOrEqualTo(
      Int.empty,
      Int.empty
    )
    assertTrue(isZeroGreaterThanOrEqualToZero)
    assertEquals(
      isZeroGreaterThanOrEqualToZero,
      pipe(
        Int.empty, //
        Int.greaterThanOrEqualTo(Int.empty)
      )
    )

    assertTrue(Int.greaterThanOrEqualTo(Int.empty, Int.of(-Int.empty)))

    const isFourGreaterThanOrEqualToNegativeTwo = Int.greaterThanOrEqualTo(
      four,
      negativeTwo
    )
    assertTrue(isFourGreaterThanOrEqualToNegativeTwo)
    assertEquals(
      isFourGreaterThanOrEqualToNegativeTwo,
      pipe(four, Int.greaterThanOrEqualTo(negativeTwo))
    )
  })

  it("between", () => {
    const options = {
      minimum: Int.of(0),
      maximum: Int.of(5)
    } as const

    const isThreeBetweenZeroAndFive = Int.between(Int.of(3), options)

    assertTrue(
      isThreeBetweenZeroAndFive,
      "Value is between minimum and maximum"
    )
    assertEquals(
      isThreeBetweenZeroAndFive,
      pipe(Int.of(3), Int.between(options))
    )

    const isZeroBetweenZeroAndFive = Int.between(Int.of(0), options)

    assertTrue(
      isZeroBetweenZeroAndFive,
      "The lower bound of the range is inclusive"
    )
    assertEquals(
      isZeroBetweenZeroAndFive,
      pipe(Int.of(0), Int.between(options))
    )

    const isFiveBetweenZeroAndFive = Int.between(Int.of(5), options)

    assertTrue(
      isFiveBetweenZeroAndFive,
      "The higher bound of the range is inclusive"
    )
    assertEquals(
      isFiveBetweenZeroAndFive,
      pipe(Int.of(5), Int.between(options))
    )

    const isMinusOneBetweenZeroAndFive = Int.between(Int.of(-1), options)

    assertFalse(
      isMinusOneBetweenZeroAndFive,
      "Value is out of the lower bound defined by the range"
    )
    assertEquals(
      isMinusOneBetweenZeroAndFive,
      pipe(Int.of(-1), Int.between(options))
    )

    const isSixBetweenZeroAndFive = Int.between(Int.of(6), options)

    assertFalse(
      isSixBetweenZeroAndFive,
      "Value is out of the higher bound defined by the range"
    )
    assertEquals(isSixBetweenZeroAndFive, pipe(Int.of(6), Int.between(options)))

    assertTrue(
      Int.between(Int.of(0), {
        minimum: Int.of(0),
        maximum: Int.of(0)
      }),
      "The value is equal to both minimum and maximum bounds of the range"
    )

    assertTrue(
      Int.between(Int.of(0), {
        minimum: Int.of(-Int.empty),
        maximum: Int.empty
      })
    )
  })

  it("clamp", () => {
    const clampOptions = { minimum: Int.empty, maximum: Int.of(5) } as const
    const clampBetweenZeroAndFive: (n: Int.Int) => Int.Int = Int.clamp(clampOptions)

    // Test value within range
    const valueWithinRange = Int.clamp(Int.of(3), clampOptions)
    strictEqual(
      valueWithinRange,
      Int.of(3),
      "Value within range should remain unchanged"
    )
    assertEquals(valueWithinRange, pipe(Int.of(3), clampBetweenZeroAndFive))

    // Test minimum boundary value (inclusive)
    const minBoundaryValue = Int.clamp(Int.of(0), clampOptions)
    strictEqual(
      minBoundaryValue,
      Int.of(0),
      "Minimum boundary value should remain unchanged (inclusive)"
    )
    assertEquals(minBoundaryValue, pipe(Int.of(0), clampBetweenZeroAndFive))

    // Test maximum boundary value (inclusive)
    const maxBoundaryValue = Int.clamp(Int.of(5), clampOptions)
    strictEqual(
      maxBoundaryValue,
      Int.of(5),
      "Maximum boundary value should remain unchanged (inclusive)"
    )
    assertEquals(maxBoundaryValue, pipe(Int.of(5), clampBetweenZeroAndFive))

    // Test value below minimum
    const valueBelowMin = Int.clamp(Int.of(-1), clampOptions)
    strictEqual(
      valueBelowMin,
      Int.of(0),
      "Value below minimum should be clamped to minimum"
    )
    assertEquals(valueBelowMin, pipe(Int.of(-1), clampBetweenZeroAndFive))

    // Test value above maximum
    const valueAboveMax = Int.clamp(Int.of(6), clampOptions)
    strictEqual(
      valueAboveMax,
      Int.of(5),
      "Value above maximum should be clamped to maximum"
    )
    assertEquals(valueAboveMax, pipe(Int.of(6), clampBetweenZeroAndFive))
  })

  it("min", () => {
    const two = Int.of(2)
    const three = Int.of(3)
    const negativeTwo = Int.of(-2)

    // case: first value is smaller
    const firstValueSmaller = Int.min(two, three)
    strictEqual(
      firstValueSmaller,
      two,
      "When first value is smaller, it should be returned"
    )
    assertEquals(firstValueSmaller, pipe(two, Int.min(three)))

    // case: second value is smaller
    const secondValueSmaller = Int.min(three, two)
    strictEqual(
      secondValueSmaller,
      two,
      "When second value is smaller, it should be returned"
    )
    assertEquals(secondValueSmaller, pipe(three, Int.min(two)))

    // case: equal values
    const equalValues = Int.min(two, two)
    strictEqual(
      equalValues,
      two,
      "When values are equal, either can be returned"
    )
    assertEquals(equalValues, pipe(two, Int.min(two)))

    // case: negative value is smaller
    const negativeValueSmaller = Int.min(negativeTwo, two)
    strictEqual(
      negativeValueSmaller,
      negativeTwo,
      "When comparing positive and negative values, the smaller one should be returned"
    )
    assertEquals(negativeValueSmaller, pipe(negativeTwo, Int.min(two)))
  })

  it("max", () => {
    const two = Int.of(2)
    const three = Int.of(3)
    const negativeTwo = Int.of(-2)

    // case: first value is larger
    const firstValueLarger = Int.max(three, two)
    strictEqual(
      firstValueLarger,
      three,
      "When first value is larger, it should be returned"
    )
    assertEquals(firstValueLarger, pipe(three, Int.max(two)))

    // case: second value is larger
    const secondValueLarger = Int.max(two, three)
    strictEqual(
      secondValueLarger,
      three,
      "When second value is larger, it should be returned"
    )
    assertEquals(secondValueLarger, pipe(two, Int.max(three)))

    // case: equal values
    const equalValues = Int.max(two, two)
    strictEqual(
      equalValues,
      two,
      "When values are equal, either can be returned"
    )
    assertEquals(equalValues, pipe(two, Int.max(two)))

    // case: positive value is larger
    const positiveValueLarger = Int.max(negativeTwo, two)
    strictEqual(
      positiveValueLarger,
      two,
      "When comparing positive and negative values, the larger one should be returned"
    )
    assertEquals(positiveValueLarger, pipe(negativeTwo, Int.max(two)))
  })

  it("sign", () => {
    strictEqual(Int.sign(Int.of(-10)), -1)
    strictEqual(Int.sign(Int.of(0)), 0)
    strictEqual(Int.sign(Int.of(10)), 1)
  })

  it.skip("sumAll", () => {
    strictEqual(Int.sumAll([Int.of(2), Int.of(3), Int.of(4)]), 9)
  })

  it.skip("multiplyAll", () => {
    strictEqual(Int.multiplyAll([Int.of(2), Int.empty, Int.of(4)]), 0)

    strictEqual(Int.multiplyAll([Int.of(2), Int.of(3), Int.of(4)]), 24)
  })

  it.skip("scratchpad", () => {})
})
