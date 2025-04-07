import { describe, it } from "@effect/vitest"
import { Brand, Either, Option, pipe } from "effect"
import * as Int from "effect/Int"
import * as PositiveInt from "effect/PositiveInt"
import { assertFalse, assertNone, assertRight, assertSome, assertTrue, strictEqual, throws } from "effect/test/util"

describe("PositiveInt", () => {
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

      strictEqual<PositiveInt.PositiveInt>(PositiveInt.of(1), PositiveInt.one)
      strictEqual<PositiveInt.PositiveInt>(
        PositiveInt.of(zero),
        PositiveInt.zero
      )
      strictEqual(PositiveInt.of(maxSafeInt), maxSafeInt)

      for (const value of nonIntegers) {
        throws(
          () => PositiveInt.of(value),
          Brand.error(`Expected ${value} to be an integer`) as unknown as Error
        )
      }

      for (const value of negativeIntegers) {
        throws(
          () => PositiveInt.of(value),
          Brand.error(
            `Expected ${value} to be positive or zero`
          ) as unknown as Error
        )
      }

      for (const value of specialValues) {
        throws(() => PositiveInt.of(value))
      }
    })

    it("demonstrates type safety with of", () => {
      // Function that only accepts PositiveInt
      const calculateArea: (radius: PositiveInt.PositiveInt) => number = (
        radius
      ) => Math.PI * radius ** 2

      // Valid usage
      strictEqual(calculateArea(PositiveInt.of(5)), Math.PI * 25)

      // Would fail at compile time (demonstrated with runtime check)
      throws(() => {
        // @ts-expect-error - This would fail at compile time
        calculateArea(-5)
      })
    })

    it("zero", () => {
      strictEqual(PositiveInt.zero, 0)
      strictEqual<PositiveInt.PositiveInt>(PositiveInt.zero, PositiveInt.of(0))
    })

    it("one", () => {
      strictEqual(PositiveInt.one, 1)
      strictEqual<PositiveInt.PositiveInt>(PositiveInt.one, PositiveInt.of(1))
    })

    it("option", () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER

      assertSome(PositiveInt.option(42), PositiveInt.of(42))
      assertSome(PositiveInt.option(0), PositiveInt.of(0))
      assertSome(PositiveInt.option(Int.zero), PositiveInt.zero)
      assertSome(PositiveInt.option(maxSafeInt), maxSafeInt)

      for (const value of nonIntegers) {
        assertNone(PositiveInt.option(value))
      }

      for (const value of negativeIntegers) {
        assertNone(PositiveInt.option(value))
      }

      for (const value of specialValues) {
        assertNone(PositiveInt.option(value))
      }

      assertNone(PositiveInt.option(+Infinity))
      assertNone(PositiveInt.option(-Infinity))
    })

    it("demonstrates safe conversion with option", () => {
      // Function that safely converts and processes a number
      const safelyProcessRadius: (input: number) => Option.Option<number> = (
        input
      ) =>
        pipe(
          PositiveInt.option(input),
          Option.map((radius) => Math.PI * radius ** 2)
        )

      // Valid input
      assertSome(safelyProcessRadius(5), Math.PI * 25)

      // Invalid inputs return None
      assertNone(safelyProcessRadius(-5))
      assertNone(safelyProcessRadius(3.14))
    })

    it("either", () => {
      // Valid integers return Right<PositiveInt>
      assertRight(PositiveInt.either(0), PositiveInt.zero)
      assertRight(PositiveInt.either(Int.zero), PositiveInt.zero)

      assertRight(
        PositiveInt.either(Number.MAX_SAFE_INTEGER),
        PositiveInt.of(Number.MAX_SAFE_INTEGER)
      )

      for (const value of nonIntegers) {
        assertTrue(Either.isLeft(PositiveInt.either(value)))
      }

      for (const value of negativeIntegers) {
        assertTrue(Either.isLeft(PositiveInt.either(value)))
      }

      for (const value of specialValues) {
        assertTrue(Either.isLeft(PositiveInt.either(value)))
      }

      // Error messages detail the validation failure
      const kelvin = -273
      pipe(
        PositiveInt.either(kelvin),
        Either.getLeft,
        Option.match({
          onNone: () => assertFalse(true, "Should have error message"),
          onSome: ([{ message }]) => {
            strictEqual(message, `Expected ${kelvin} to be positive or zero`)
          }
        })
      )
    })

    it("demonstrates error handling with either", () => {
      // Function that provides detailed errors for invalid inputs
      const processWithErrorHandling = (input: number): string =>
        pipe(
          PositiveInt.either(input),
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
        "Error: Expected -5 to be positive or zero"
      )

      strictEqual(
        processWithErrorHandling(3.14),
        "Error: Expected 3.14 to be an integer"
      )
    })
  })

  describe("Guards", () => {
    it("isPositiveInt", () => {
      // Valid positive integers
      assertTrue(PositiveInt.isPositiveInt(0))
      assertTrue(PositiveInt.isPositiveInt(1))
      assertTrue(PositiveInt.isPositiveInt(42))
      assertTrue(PositiveInt.isPositiveInt(Number.MAX_SAFE_INTEGER))

      // Valid positive integers from Int module
      assertTrue(PositiveInt.isPositiveInt(Int.zero))
      assertTrue(PositiveInt.isPositiveInt(Int.one))

      // Non-integers
      for (const value of nonIntegers) {
        assertFalse(PositiveInt.isPositiveInt(value))
      }

      // Negative integers
      for (const value of negativeIntegers) {
        assertFalse(PositiveInt.isPositiveInt(value))
      }

      // Special values
      for (const value of specialValues) {
        assertFalse(PositiveInt.isPositiveInt(value))
      }

      // Non-number types
      assertFalse(PositiveInt.isPositiveInt("0"))
      assertFalse(PositiveInt.isPositiveInt(true))
      assertFalse(PositiveInt.isPositiveInt({}))
      assertFalse(PositiveInt.isPositiveInt([]))
      assertFalse(PositiveInt.isPositiveInt(null))
      assertFalse(PositiveInt.isPositiveInt(undefined))
    })
  })

  describe("Math", () => {
    it("sum", () => {
      const ten = PositiveInt.of(10)
      const thirtyTwo = PositiveInt.of(32)
      const meaningOfLife = PositiveInt.of(42)
      const largeNumber = Number.MAX_SAFE_INTEGER - 10

      // Basic functionality tests
      strictEqual(
        PositiveInt.sum(ten, thirtyTwo),
        pipe(ten, PositiveInt.sum(thirtyTwo)),
        "should add two positive integers correctly"
      )

      // Boundary conditions
      strictEqual(
        PositiveInt.sum(PositiveInt.zero, meaningOfLife),
        PositiveInt.sum(meaningOfLife, PositiveInt.zero),
        "Adding zero should not change the value"
      )
      strictEqual(
        PositiveInt.sum(PositiveInt.of(largeNumber), ten),
        Number.MAX_SAFE_INTEGER,
        "Should correctly handle large numbers"
      )

      strictEqual(
        PositiveInt.sum(PositiveInt.of(41), PositiveInt.one),
        42,
        "Adding one should increment the value"
      )

      // Mathematical properties
      // Commutativity: a + b = b + a
      strictEqual(
        PositiveInt.sum(ten, thirtyTwo),
        PositiveInt.sum(thirtyTwo, ten),
        "Addition is commutative"
      )

      // Associativity: (a + b) + c = a + (b + c)
      strictEqual(
        pipe(
          ten,
          PositiveInt.sum(PositiveInt.of(20)),
          PositiveInt.sum(PositiveInt.of(12))
        ),
        pipe(
          ten,
          PositiveInt.sum(
            PositiveInt.sum(PositiveInt.of(20), PositiveInt.of(12))
          )
        ),
        "Addition is associative"
      )

      // Identity element: a + 0 = a
      strictEqual(
        pipe(meaningOfLife, PositiveInt.sum(PositiveInt.zero)),
        meaningOfLife,
        "Zero is the identity element for addition"
      )

      // Chaining operations
      strictEqual(
        pipe(
          PositiveInt.of(0),
          PositiveInt.sum(PositiveInt.of(10)),
          PositiveInt.sum(PositiveInt.of(20)),
          PositiveInt.sum(PositiveInt.of(12))
        ),
        meaningOfLife,
        "Should correctly chain multiple additions"
      )
    })
  })
})
