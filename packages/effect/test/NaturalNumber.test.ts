import { describe, it } from "@effect/vitest"
import { Brand, Either, Option, pipe } from "effect"
import * as Integer from "effect/Integer"
import { DivisionByZeroError } from "effect/internal/number"
import * as NaturalNumber from "effect/NaturalNumber"
import {
  assertFalse,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  notDeepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"

describe("NaturalNumber", () => {
  const nonIntegers = [0.5, 1.5, 3.14, Number.EPSILON]
  const negativeIntegers = [-1, -2, -100, Number.MIN_SAFE_INTEGER]
  const specialValues = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ]

  describe("Constructors", () => {
    const maxSafeInt = Number.MAX_SAFE_INTEGER

    it("of", () => {
      const zero = 0

      strictEqual<NaturalNumber.NaturalNumber>(
        NaturalNumber.of(1),
        NaturalNumber.one
      )
      strictEqual<NaturalNumber.NaturalNumber>(
        NaturalNumber.of(zero),
        NaturalNumber.zero
      )
      strictEqual(NaturalNumber.of(maxSafeInt), maxSafeInt)

      for (const value of nonIntegers) {
        throws(
          () => NaturalNumber.of(value),
          Brand.error(
            `Expected (${value}) to be an integer`
          ) as unknown as Error
        )
      }

      for (const value of negativeIntegers) {
        throws(
          () => NaturalNumber.of(value),
          Brand.error(
            `Expected (${value}) to be a greater than or equal to (0)`
          ) as unknown as Error
        )
      }

      for (const value of specialValues) {
        throws(() => NaturalNumber.of(value))
      }
    })

    it("demonstrates type safety with of", () => {
      // Function that only accepts NaturalNumber
      const calculateArea: (radius: NaturalNumber.NaturalNumber) => number = (
        radius
      ) => Math.PI * radius ** 2

      // Valid usage
      strictEqual(calculateArea(NaturalNumber.of(5)), Math.PI * 25)

      // Would fail at compile time (demonstrated with runtime check)
      throws(() => {
        // @ts-expect-error - This would fail at compile time
        calculateArea(-5)
      })
    })

    it("zero", () => {
      strictEqual(NaturalNumber.zero, 0)
      strictEqual<NaturalNumber.NaturalNumber>(
        NaturalNumber.zero,
        NaturalNumber.of(0)
      )
    })

    it("one", () => {
      strictEqual(NaturalNumber.one, 1)
      strictEqual<NaturalNumber.NaturalNumber>(
        NaturalNumber.one,
        NaturalNumber.of(1)
      )
    })

    it("option", () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER

      assertSome(NaturalNumber.option(42), NaturalNumber.of(42))
      assertSome(NaturalNumber.option(0), NaturalNumber.of(0))
      assertSome(NaturalNumber.option(Integer.zero), NaturalNumber.zero)
      assertSome(NaturalNumber.option(maxSafeInt), maxSafeInt)

      for (const value of nonIntegers) {
        assertNone(NaturalNumber.option(value))
      }

      for (const value of negativeIntegers) {
        assertNone(NaturalNumber.option(value))
      }

      for (const value of specialValues) {
        assertNone(NaturalNumber.option(value))
      }

      assertNone(NaturalNumber.option(+Infinity))
      assertNone(NaturalNumber.option(-Infinity))
    })

    it("demonstrates safe conversion with option", () => {
      // Function that safely converts and processes a number
      const safelyProcessRadius: (input: number) => Option.Option<number> = (
        input
      ) =>
        pipe(
          NaturalNumber.option(input),
          Option.map((radius) => Math.PI * radius ** 2)
        )

      // Valid input
      assertSome(safelyProcessRadius(5), Math.PI * 25)

      // Invalid inputs return None
      assertNone(safelyProcessRadius(-5))
      assertNone(safelyProcessRadius(3.14))
    })

    it("either", () => {
      // Valid integers return Right<NaturalNumber>
      assertRight(NaturalNumber.either(0), NaturalNumber.zero)
      assertRight(NaturalNumber.either(Integer.zero), NaturalNumber.zero)

      assertRight(
        NaturalNumber.either(Number.MAX_SAFE_INTEGER),
        NaturalNumber.of(Number.MAX_SAFE_INTEGER)
      )

      for (const value of nonIntegers) {
        assertTrue(Either.isLeft(NaturalNumber.either(value)))
      }

      for (const value of negativeIntegers) {
        assertTrue(Either.isLeft(NaturalNumber.either(value)))
      }

      for (const value of specialValues) {
        assertTrue(Either.isLeft(NaturalNumber.either(value)))
      }

      // Error messages detail the validation failure
      const kelvin = -273
      pipe(
        NaturalNumber.either(kelvin),
        Either.getLeft,
        Option.match({
          onNone: () => assertFalse(true, "Should have error message"),
          onSome: ([{ message }]) => {
            strictEqual(
              message,
              `Expected (${kelvin}) to be a greater than or equal to (0)`
            )
          }
        })
      )
    })

    it("demonstrates error handling with either", () => {
      // Function that provides detailed errors for invalid inputs
      const processWithErrorHandling = (input: number): string =>
        pipe(
          NaturalNumber.either(input),
          Either.match({
            onLeft: ([{ message }]) => `Error: ${message}`,
            onRight: (radius) => `Area: ${Math.PI * radius ** 2}`
          })
        )

      // Valid input
      strictEqual(processWithErrorHandling(5), `Area: ${Math.PI * 25}`)

      // Invalid inputs provide error messages
      strictEqual(
        processWithErrorHandling(-5),
        "Error: Expected (-5) to be a greater than or equal to (0)"
      )

      strictEqual(
        processWithErrorHandling(3.14),
        "Error: Expected (3.14) to be an integer"
      )
    })
  })

  describe("Guards", () => {
    it("isNaturalNumber", () => {
      // Valid positive integers
      assertTrue(NaturalNumber.isNaturalNumber(0))
      assertTrue(NaturalNumber.isNaturalNumber(1))
      assertTrue(NaturalNumber.isNaturalNumber(42))
      assertTrue(NaturalNumber.isNaturalNumber(Number.MAX_SAFE_INTEGER))

      // Valid positive integers from Integer module
      assertTrue(NaturalNumber.isNaturalNumber(Integer.zero))
      assertTrue(NaturalNumber.isNaturalNumber(Integer.one))

      // Non-integers
      for (const value of nonIntegers) {
        assertFalse(NaturalNumber.isNaturalNumber(value))
      }

      // Negative integers
      for (const value of negativeIntegers) {
        assertFalse(NaturalNumber.isNaturalNumber(value))
      }

      // Special values
      for (const value of specialValues) {
        assertFalse(NaturalNumber.isNaturalNumber(value))
      }

      // Non-number types
      assertFalse(NaturalNumber.isNaturalNumber("0"))
      assertFalse(NaturalNumber.isNaturalNumber(true))
      assertFalse(NaturalNumber.isNaturalNumber({}))
      assertFalse(NaturalNumber.isNaturalNumber([]))
      assertFalse(NaturalNumber.isNaturalNumber(null))
      assertFalse(NaturalNumber.isNaturalNumber(undefined))
    })
  })

  describe("Math", () => {
    const two = NaturalNumber.of(2)
    const three = NaturalNumber.of(3)
    const four = NaturalNumber.of(4)
    const five = NaturalNumber.of(5)
    const six = NaturalNumber.of(6)
    const ten = NaturalNumber.of(10)
    const meaningOfLife = NaturalNumber.of(42)
    const largeNumber = NaturalNumber.of(Number.MAX_SAFE_INTEGER - 10)

    it("sum", () => {
      const thirtyTwo = NaturalNumber.of(32)

      // Basic functionality tests
      strictEqual(
        NaturalNumber.sum(ten, thirtyTwo),
        pipe(ten, NaturalNumber.sum(thirtyTwo)),
        "should add two positive integers correctly"
      )

      // Boundary conditions
      strictEqual(
        NaturalNumber.sum(NaturalNumber.zero, meaningOfLife),
        NaturalNumber.sum(meaningOfLife, NaturalNumber.zero),
        "Adding zero should not change the value"
      )
      strictEqual(
        NaturalNumber.sum(NaturalNumber.of(largeNumber), ten),
        Number.MAX_SAFE_INTEGER,
        "Should correctly handle large numbers"
      )

      strictEqual(
        NaturalNumber.sum(NaturalNumber.of(41), NaturalNumber.one),
        42,
        "Adding one should increment the value"
      )

      // Mathematical properties
      // Commutativity: a + b = b + a
      strictEqual(
        NaturalNumber.sum(ten, thirtyTwo),
        NaturalNumber.sum(thirtyTwo, ten),
        "Addition is commutative"
      )

      // Associativity: (a + b) + c = a + (b + c)
      strictEqual(
        pipe(
          ten,
          NaturalNumber.sum(NaturalNumber.of(20)),
          NaturalNumber.sum(NaturalNumber.of(12))
        ),
        pipe(
          ten,
          NaturalNumber.sum(
            NaturalNumber.sum(NaturalNumber.of(20), NaturalNumber.of(12))
          )
        ),
        "Addition is associative"
      )

      // Identity element: a + 0 = a
      strictEqual(
        pipe(meaningOfLife, NaturalNumber.sum(NaturalNumber.zero)),
        meaningOfLife,
        "Zero is the identity element for addition"
      )

      // Chaining operations
      strictEqual(
        pipe(
          NaturalNumber.of(0),
          NaturalNumber.sum(NaturalNumber.of(10)),
          NaturalNumber.sum(NaturalNumber.of(20)),
          NaturalNumber.sum(NaturalNumber.of(12))
        ),
        meaningOfLife,
        "Should correctly chain multiple additions"
      )
    })

    it("subtractToInteger", () => {
      // Basic functionality tests
      strictEqual(
        NaturalNumber.subtractToInteger(three, NaturalNumber.one),
        pipe(three, NaturalNumber.subtractToInteger(NaturalNumber.one))
      )

      // Boundary conditions

      strictEqual(
        NaturalNumber.subtractToInteger(meaningOfLife, NaturalNumber.zero),
        Integer.of(42),
        "Subtracting zero doesn't change the value"
      )

      strictEqual(
        NaturalNumber.subtractToInteger(NaturalNumber.zero, meaningOfLife),
        Integer.of(-42),
        "Zero minus a positive number equals the negative of that number"
      )

      strictEqual(
        NaturalNumber.subtractToInteger(meaningOfLife, meaningOfLife),
        Integer.zero,
        "Subtracting a number from itself results in zero"
      )

      strictEqual(
        NaturalNumber.subtractToInteger(largeNumber, NaturalNumber.of(10)),
        Integer.of(Number.MAX_SAFE_INTEGER - 20),
        "Should correctly handle large numbers"
      )

      strictEqual(
        NaturalNumber.subtractToInteger(
          NaturalNumber.of(5),
          NaturalNumber.of(10)
        ),
        Integer.of(-5),
        "Subtracting a larger number from a smaller one results in a negative number"
      )

      // Mathematical properties:

      /** Anti-commutativity: a - b = -(b - a) */
      strictEqual(
        pipe(three, NaturalNumber.subtractToInteger(two)),
        -pipe(two, NaturalNumber.subtractToInteger(three)),
        "Subtraction is anti-commutative: a - b = -(b - a)"
      )

      /** Non-associativity: (a - b) - c ≠ a - (b - c) */
      notDeepStrictEqual(
        pipe(
          three,
          NaturalNumber.subtractToInteger(two),
          Integer.subtract(NaturalNumber.one)
        ),
        pipe(
          three,
          Integer.subtract(
            pipe(two, NaturalNumber.subtractToInteger(NaturalNumber.one))
          )
        ),
        "Subtraction is not associative: (a - b) - c ≠ a - (b - c)"
      )

      /** Identity element: 0 - a = -a */
      strictEqual(
        pipe(NaturalNumber.zero, NaturalNumber.subtractToInteger(three)),
        Integer.of(-3),
        "Zero is the identity element: 0 - a = -a"
      )

      /** Chaining subtractions */
      strictEqual(
        pipe(
          NaturalNumber.of(10),
          NaturalNumber.subtractToInteger(NaturalNumber.of(3)),
          Integer.subtract(Integer.of(2))
        ),
        Integer.of(5),
        "Should correctly chain multiple subtractions"
      )

      /** Mixing with other operations */
      strictEqual(
        pipe(
          NaturalNumber.of(10),
          NaturalNumber.subtractToInteger(NaturalNumber.of(3)),
          Integer.sum(Integer.of(5))
        ),
        Integer.of(12),
        "Should work correctly when mixed with other operations"
      )
    })

    it("multiply", () => {
      // Basic functionality tests
      strictEqual<NaturalNumber.NaturalNumber>(
        pipe(two, NaturalNumber.multiply(three)),
        NaturalNumber.multiply(two, three),
        "both data-first and data-last APIs should work"
      )

      // Boundary conditions
      strictEqual(
        NaturalNumber.multiply(NaturalNumber.zero, five),
        NaturalNumber.zero,
        "Multiplying by zero should result in zero"
      )

      strictEqual(
        NaturalNumber.multiply(five, NaturalNumber.zero),
        NaturalNumber.zero,
        "Multiplying by zero should result in zero (commutative)"
      )

      strictEqual(
        NaturalNumber.multiply(NaturalNumber.one, five),
        five,
        "Multiplying by one should not change the value"
      )

      strictEqual(
        NaturalNumber.multiply(five, NaturalNumber.one),
        five,
        "Multiplying by one should not change the value (commutative)"
      )

      // Mathematical properties

      /** Closure: If a, b ∈ ℕ, then a × b ∈ ℕ */
      assertTrue(
        NaturalNumber.isNaturalNumber(NaturalNumber.multiply(three, four)),
        "Multiplication is closed within natural numbers"
      )

      /** Commutativity: a × b = b × a */
      strictEqual(
        pipe(two, NaturalNumber.multiply(three)),
        pipe(three, NaturalNumber.multiply(two)),
        "Multiplication is commutative: a × b = b × a"
      )

      /** Associativity: (a × b) × c = a × (b × c) */
      strictEqual(
        pipe(two, NaturalNumber.multiply(three), NaturalNumber.multiply(four)),
        pipe(two, NaturalNumber.multiply(NaturalNumber.multiply(three, four))),
        "Multiplication is associative: (a × b) × c = a × (b × c)"
      )

      /** Identity element: a × 1 = a */
      strictEqual(
        NaturalNumber.multiply(five, NaturalNumber.one),
        five,
        "1 is the multiplicative identity: a × 1 = a"
      )

      /** Absorption element: a × 0 = 0 */
      strictEqual(
        NaturalNumber.multiply(five, NaturalNumber.zero),
        NaturalNumber.zero,
        "0 is the multiplicative absorbing element: a × 0 = 0"
      )

      /** Distributivity: a × (b + c) = (a × b) + (a × c) */
      strictEqual(
        NaturalNumber.multiply(three, NaturalNumber.sum(four, five)),
        NaturalNumber.sum(
          NaturalNumber.multiply(three, four),
          NaturalNumber.multiply(three, five)
        ),
        "Multiplication distributes over addition: a × (b + c) = (a × b) + (a × c)"
      )

      /** No zero divisors: If a × b = 0, then either a = 0 or b = 0 */
      strictEqual(
        NaturalNumber.multiply(NaturalNumber.zero, five),
        NaturalNumber.zero,
        "If a × b = 0, then either a = 0 or b = 0 (case: a = 0)"
      )

      strictEqual(
        NaturalNumber.multiply(five, NaturalNumber.zero),
        NaturalNumber.zero,
        "If a × b = 0, then either a = 0 or b = 0 (case: b = 0)"
      )

      // Chaining operations
      strictEqual(
        pipe(two, NaturalNumber.multiply(three), NaturalNumber.multiply(four)),
        NaturalNumber.of(24),
        "Should correctly chain multiple multiplications"
      )

      // Mixing with other operations
      strictEqual<number>(
        pipe(
          two, //
          NaturalNumber.multiply(three), //
          NaturalNumber.sum(four), //
          Integer.unsafeDivide(ten) //
        ),
        1,
        "Should work correctly when mixed with other operations"
      )
    })

    it("divide", () => {
      // Basic functionality tests
      assertSome(pipe(six, NaturalNumber.divide(two)), 3)

      assertSome(NaturalNumber.divide(six, two), 3)

      // Test equivalence of data-first and data-last APIs
      const divideResult = pipe(six, NaturalNumber.divide(two))
      const divideResultDataFirst = NaturalNumber.divide(six, two)

      strictEqual(
        Option.getOrElse(divideResult, () => -1),
        Option.getOrElse(divideResultDataFirst, () => -1),
        "Both data-first and data-last APIs should return the same result"
      )

      // Boundary conditions

      /** Zero divided by any non-zero number should be zero */
      assertSome(NaturalNumber.divide(NaturalNumber.zero, five), 0)

      /** Division by zero should return None */
      assertNone(NaturalNumber.divide(five, NaturalNumber.zero))

      /** Division by one should not change the value */
      assertSome(NaturalNumber.divide(five, NaturalNumber.one), 5)

      /** Division resulting in a fraction should work */
      assertSome(NaturalNumber.divide(five, two), 2.5)

      // Mathematical properties

      /** Non-closure: If a, b ∈ ℕ, then a ÷ b may not ∈ ℕ */
      assertSome(NaturalNumber.divide(five, two), 2.5)

      /** Non-commutativity: a ÷ b ≠ b ÷ a */
      const divideA = Option.getOrElse(
        NaturalNumber.divide(six, three),
        () => -1
      )
      const divideB = Option.getOrElse(
        NaturalNumber.divide(three, six),
        () => -1
      )

      notDeepStrictEqual(
        divideA,
        divideB,
        "Division is not commutative: a ÷ b ≠ b ÷ a"
      )

      /** Non-associativity: (a ÷ b) ÷ c ≠ a ÷ (b ÷ c) */
      const divideAssoc1 = pipe(
        NaturalNumber.divide(six, two),
        Option.flatMap((result) =>
          NaturalNumber.option(result).pipe(
            Option.flatMap((n) => NaturalNumber.divide(n, three))
          )
        )
      )

      const divideAssoc2 = pipe(
        NaturalNumber.divide(three, two),
        Option.flatMap((result) =>
          NaturalNumber.divide(
            six,
            NaturalNumber.option(result).pipe(
              Option.getOrElse(() => NaturalNumber.one)
            )
          )
        )
      )

      notDeepStrictEqual(
        divideAssoc1,
        divideAssoc2,
        "Division is not associative: (a ÷ b) ÷ c ≠ a ÷ (b ÷ c)"
      )

      /**
       * Right identity element: a ÷ 1 = a
       *
       * 1 is the right identity element for division: a ÷ 1 = a
       */
      assertSome(NaturalNumber.divide(five, NaturalNumber.one), 5)

      /** Division by zero is undefined */
      assertNone(NaturalNumber.divide(five, NaturalNumber.zero))

      /** Not generally distributive over addition */
      notDeepStrictEqual(
        Option.getOrElse(
          NaturalNumber.divide(ten, NaturalNumber.sum(two, three)),
          () => -1
        ),
        Option.getOrElse(
          pipe(
            NaturalNumber.divide(ten, two),
            Option.flatMap((result1) =>
              pipe(
                NaturalNumber.divide(ten, three),
                Option.map((result2) => result1 + result2)
              )
            )
          ),
          () => -1
        ),
        "Division is not distributive over addition: a ÷ (b + c) ≠ (a ÷ b) + (a ÷ c)"
      )

      // Chaining operations
      assertSome(
        pipe(
          NaturalNumber.divide(six, two),
          Option.flatMap((result) =>
            pipe(
              NaturalNumber.option(result),
              Option.flatMap((n) => NaturalNumber.divide(n, NaturalNumber.one))
            )
          )
        ),
        3
      )

      // Mixing with other operations
      assertSome(
        pipe(
          NaturalNumber.sum(four, two),
          NaturalNumber.divide(two),
          Option.map((result) => result ** 2)
        ),
        9
      )
    })

    it("unsafeDivide", () => {
      // Basic functionality tests
      strictEqual(
        pipe(six, NaturalNumber.unsafeDivide(two)),
        NaturalNumber.unsafeDivide(six, two),
        "both data-first and data-last APIs should work"
      )

      strictEqual(pipe(six, NaturalNumber.unsafeDivide(two)), 3)

      // Boundary conditions

      /** Zero divided by any non-zero number should be zero */
      strictEqual(
        NaturalNumber.unsafeDivide(NaturalNumber.zero, five),
        0,
        "Zero divided by any non-zero number should be zero"
      )

      /** Division by zero throws error */
      throws(
        () => NaturalNumber.unsafeDivide(five, NaturalNumber.zero),
        DivisionByZeroError.divisionByZero(five)
      )

      /** Indeterminate form (0/0) throws error */
      throws(
        () => NaturalNumber.unsafeDivide(NaturalNumber.zero, NaturalNumber.zero),
        DivisionByZeroError.indeterminateForm()
      )

      /** Division by one should not change the value */
      strictEqual(
        NaturalNumber.unsafeDivide(five, NaturalNumber.one),
        5,
        "Division by one should not change the value"
      )

      /** Division resulting in a fraction should work */
      strictEqual(
        NaturalNumber.unsafeDivide(five, two),
        2.5,
        "Division resulting in a fraction should work"
      )

      // Mathematical properties

      /** Non-closure: If a, b ∈ ℕ, then a ÷ b may not ∈ ℕ */
      strictEqual(
        NaturalNumber.unsafeDivide(five, two),
        2.5,
        "Division is not closed within natural numbers"
      )

      /** Non-commutativity: a ÷ b ≠ b ÷ a */
      notDeepStrictEqual(
        NaturalNumber.unsafeDivide(six, three),
        NaturalNumber.unsafeDivide(three, six),
        "Division is not commutative: a ÷ b ≠ b ÷ a"
      )

      /** Non-associativity: (a ÷ b) ÷ c ≠ a ÷ (b ÷ c) */
      notDeepStrictEqual(
        // @ts-expect-error - can't assign number to NaturalNumber
        NaturalNumber.unsafeDivide(NaturalNumber.unsafeDivide(six, two), three),
        // @ts-expect-error - can't assign number to NaturalNumber
        NaturalNumber.unsafeDivide(six, NaturalNumber.unsafeDivide(two, three)),
        "Division is not associative: (a ÷ b) ÷ c ≠ a ÷ (b ÷ c)"
      )

      /** Right identity element: a ÷ 1 = a */
      strictEqual(
        NaturalNumber.unsafeDivide(five, NaturalNumber.one),
        five,
        "1 is the right identity element for division: a ÷ 1 = a"
      )

      /** Not generally distributive over addition */
      notDeepStrictEqual(
        NaturalNumber.unsafeDivide(ten, NaturalNumber.sum(two, three)),
        NaturalNumber.unsafeDivide(ten, two) +
          NaturalNumber.unsafeDivide(ten, three),
        "Division is not distributive over addition: a ÷ (b + c) ≠ (a ÷ b) + (a ÷ c)"
      )

      // Mixing with other operations
      strictEqual(
        NaturalNumber.unsafeDivide(NaturalNumber.sum(four, two), two),
        3,
        "Should work correctly when mixed with other operations"
      )
    })

    it("increment", () => {
      // Basic functionality tests
      strictEqual(
        NaturalNumber.increment(NaturalNumber.one),
        two,
        "Incrementing 1 should result in 2"
      )

      strictEqual(
        pipe(
          NaturalNumber.zero,
          NaturalNumber.increment,
          NaturalNumber.increment,
          NaturalNumber.increment,
          NaturalNumber.increment
        ),
        NaturalNumber.of(4),
        "Chaining multiple increments should work correctly"
      )

      // Boundary conditions
      strictEqual(
        NaturalNumber.increment(NaturalNumber.zero),
        NaturalNumber.one,
        "Incrementing 0 should result in 1"
      )

      const largeNumber = NaturalNumber.of(Number.MAX_SAFE_INTEGER - 1)
      strictEqual(
        NaturalNumber.increment(largeNumber),
        Number.MAX_SAFE_INTEGER,
        "Should correctly handle large numbers"
      )

      // Mathematical properties

      /** Closure: If n ∈ ℕ, then increment(n) ∈ ℕ */
      assertTrue(
        NaturalNumber.isNaturalNumber(NaturalNumber.increment(five)),
        "Increment is closed within natural numbers"
      )

      /** Injective: If increment(a) = increment(b), then a = b */
      const a = NaturalNumber.of(42)
      const b = NaturalNumber.of(42)
      const c = NaturalNumber.of(43)

      strictEqual(
        NaturalNumber.increment(a),
        NaturalNumber.increment(b),
        "Increment of equal numbers should be equal"
      )

      notDeepStrictEqual(
        NaturalNumber.increment(a),
        NaturalNumber.increment(c),
        "Increment of different numbers should be different"
      )

      /** No fixed points: increment(n) ≠ n for all n ∈ ℕ */
      notDeepStrictEqual(
        NaturalNumber.increment(five),
        five,
        "Increment of a number should not equal the number itself"
      )

      /**
       * Successor function: increment defines the successor for each natural
       * number
       */
      strictEqual(
        NaturalNumber.increment(NaturalNumber.of(41)),
        NaturalNumber.of(42),
        "Increment should produce the successor of a natural number"
      )

      /** Relation to addition: increment(n) = n + 1 */
      strictEqual(
        NaturalNumber.increment(five),
        NaturalNumber.sum(five, NaturalNumber.one),
        "Increment should be equivalent to adding 1"
      )

      // Mixing with other operations
      strictEqual(
        NaturalNumber.multiply(NaturalNumber.increment(two), three),
        NaturalNumber.of(9),
        "Should work correctly when mixed with other operations"
      )

      strictEqual(
        NaturalNumber.sum(
          NaturalNumber.increment(two),
          NaturalNumber.increment(three)
        ),
        NaturalNumber.of(7),
        "Should work correctly when combined with other incremented values"
      )
    })

    it("decrementToInteger", () => {
      strictEqual(
        NaturalNumber.decrementToInteger(NaturalNumber.of(2)),
        Integer.of(1)
      )

      strictEqual(
        NaturalNumber.decrementToInteger(NaturalNumber.zero),
        Integer.of(-1)
      )

      strictEqual(
        pipe(
          NaturalNumber.of(100),
          NaturalNumber.decrementToInteger,
          Integer.decrement,
          Integer.decrement,
          Integer.decrement
        ),
        Integer.of(96)
      )
    })

    it("decrementSafe", () => {
      // Basic functionality tests
      assertSome(
        NaturalNumber.decrementSafe(NaturalNumber.of(5)),
        NaturalNumber.of(4)
      )

      assertSome(
        NaturalNumber.decrementSafe(NaturalNumber.one),
        NaturalNumber.zero
      )

      // Boundary conditions
      assertNone(NaturalNumber.decrementSafe(NaturalNumber.zero))

      assertSome(
        NaturalNumber.decrementSafe(NaturalNumber.of(Number.MAX_SAFE_INTEGER)),
        NaturalNumber.of(Number.MAX_SAFE_INTEGER - 1)
      )

      // Mathematical properties

      /**
       * Domain preservation:
       *
       * For all n ∈ ℕ, decrementSafe(n) is either Some(m) where m ∈ ℕ or None
       */
      const result = NaturalNumber.decrementSafe(NaturalNumber.of(42))
      if (Option.isSome(result)) {
        assertTrue(
          NaturalNumber.isNaturalNumber(result.value),
          "Result should be a natural number when defined"
        )
      }

      /**
       * Partiality:
       *
       * DecrementSafe(0) = None and decrementSafe(n) = Some(n-1) for all n > 0
       */
      assertNone(NaturalNumber.decrementSafe(NaturalNumber.zero))

      assertSome(
        NaturalNumber.decrementSafe(meaningOfLife),
        NaturalNumber.of(41)
      )

      /**
       * Inverse of increment: For all n ∈ ℕ, decrementSafe(increment(n)) =
       * Some(n)
       */

      assertSome(
        NaturalNumber.decrementSafe(NaturalNumber.increment(meaningOfLife)),
        meaningOfLife
      )

      // Operation chaining
      assertSome(
        pipe(
          three,
          NaturalNumber.decrementSafe,
          Option.flatMap(NaturalNumber.decrementSafe)
        ),
        NaturalNumber.one
      )

      /** Chaining decrements should result in None when reaching 0 */
      assertNone(
        pipe(
          NaturalNumber.one,
          NaturalNumber.decrementSafe, // Some(O)
          Option.flatMap(NaturalNumber.decrementSafe), // None
          Option.flatMap(NaturalNumber.decrementSafe) // None
        )
      )

      // Mixing with other operations
      assertSome(
        pipe(
          three,
          NaturalNumber.decrementSafe, // Some(2)
          Option.map((n) => NaturalNumber.sum(n, five))
        ),
        NaturalNumber.of(7)
      )

      strictEqual(
        pipe(
          ten,
          NaturalNumber.decrementSafe, // Some(9)
          Option.flatMap((n) =>
            pipe(
              n, // 9
              NaturalNumber.decrementSafe, // Some(8)
              Option.map((m) => NaturalNumber.multiply(m, two)) // Some(16)
            )
          ),
          Option.getOrThrow
        ),
        NaturalNumber.of(16)
      )
    })
  })
})
