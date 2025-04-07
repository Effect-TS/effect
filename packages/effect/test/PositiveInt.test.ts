import { describe, it } from "@effect/vitest"
import { Brand, Either, Option, pipe } from "effect"
import * as Int from "effect/Int"
import * as PositiveInt from "effect/PositiveInt"
import {
  assertEquals,
  assertFalse,
  assertLeft,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  notDeepStrictEqual,
  strictEqual,
  throws
} from "effect/test/util"

describe("PositiveInt", () => {
  describe("Constructors", () => {
    const nonIntegers = [0.5, 1.5, 3.14, Number.EPSILON]
    const negativeIntegers = [-1, -2, -100, Number.MIN_SAFE_INTEGER]
    const specialValues = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]

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
      ) => Math.PI * (radius ** 2)

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
      const safelyProcessRadius: (input: number) => Option.Option<number> = (input) =>
        pipe(
          PositiveInt.option(input),
          Option.map((radius) => Math.PI * (radius ** 2))
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
            onRight: (radius) => `Area: ${Math.PI * (radius ** 2)}`
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
})
