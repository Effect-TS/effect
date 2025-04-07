/**
 * # `PositiveInt` a.k.a. `Natural Numbers (ℕ)`
 *
 * This module provides operations for working with natural numbers (ℕ = {0, 1,
 * 2, ...}).
 *
 * Note that not all operations are closed within the set of natural numbers:
 *
 * - Addition and multiplication are closed operations (the result is always a
 *   natural number)
 * - Subtraction is not closed (may produce negative results)
 * - Division is not closed (may produce fractions)
 *
 * Operations that cannot guarantee a natural number result will return a more
 * appropriate type and are clearly documented.
 *
 * @module PositiveInt
 * @since 3.14.6
 * @experimental
 * @internal
 */

import type * as Brand from "./Brand.js"
import type * as Either from "./Either.js"
import { dual } from "./Function.js"
import type * as Int from "./Int.js"
import * as internal from "./internal/number.js"
import type * as _Option from "./Option.js"
import * as _Predicate from "./Predicate.js"

/**
 * A type representing non-negative integers (0 -> +Infinity).
 *
 * This is also known as the set of natural numbers (ℕ = {0, 1, 2, ...}).
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import * as PositiveInt from "effect/PositiveInt"
 *
 * function onlyPositiveInts(int: PositiveInt.PositiveInt): void {
 *   //... stuff for ONLY non-negative integers FANS
 * }
 *
 * onlyPositiveInts(PositiveInt.of(1)) // ok
 *
 * onlyPositiveInts(PositiveInt.of(0)) // ok too
 *
 * // @ts-expect-error - This will fail because it is not a non-negative integer
 * onlyPositiveInts(PositiveInt.of(-99))
 *
 * // @ts-expect-error - This will fail because 1.5 is not an integer
 * onlyPositiveInts(1.5)
 * ```
 *
 * @experimental
 */
export type PositiveInt = internal.PositiveInt

/**
 * Lift a number in the set of non-negative integers, and brands it as a
 * `PositiveInt`. It throws an error if the provided number is not an integer or
 * is negative.
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as PositiveInt from "effect/PositiveInt"
 * import assert from "node:assert/strict"
 *
 * const aNegativeFloat = -1.5
 *
 * assert.throws(() => {
 *   PositiveInt.of(aNegativeFloat)
 * }, `Expected ${aNegativeFloat} to be an integer`)
 *
 * assert.throws(() => {
 *   PositiveInt.of(-1)
 * }, `Expected -1 to be positive or zero`)
 * ```
 *
 * @param n - The number to be lifted in the set of non-negative integers.
 * @returns A PositiveInt branded type.
 * @experimental
 *
 * @see other constructors that do not throw, but return a {@link Brand.BrandErrors} instead are {@link module:PositiveInt.option} and {@link module:PositiveInt.either}
 */
export const of: {
  (n: number): PositiveInt
} = (n) => internal.PositiveIntConstructor(n)

/**
 * Lift a `number` in the set of `Option<PositiveInt>`, and brands it as an
 * `PositiveInt` if the provided number is a valid non-negative integer. It
 * returns `None` otherwise.
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Option, pipe } from "effect"
 * import * as PositiveInt from "effect/PositiveInt"
 * import * as assert from "node:assert/strict"
 *
 * // Valid non-negative integers return Some<PositiveInt>
 * assert.deepStrictEqual(
 *   PositiveInt.option(42),
 *   Option.some(PositiveInt.of(42))
 * )
 * assert.deepStrictEqual(
 *   PositiveInt.option(0),
 *   Option.some(PositiveInt.zero)
 * )
 * assert.deepStrictEqual(PositiveInt.option(-7), Option.none())
 *
 * // Non-integers return None
 * assert.deepStrictEqual(PositiveInt.option(3.14), Option.none())
 * assert.deepStrictEqual(PositiveInt.option(Number.NaN), Option.none())
 *
 * // Safe operations on potentially non-integer values
 * const safelyDouble = (n: number) =>
 *   pipe(
 *     PositiveInt.option(n),
 *     Option.map((positiveInt) =>
 *       PositiveInt.multiply(positiveInt, PositiveInt.of(2))
 *     )
 *   )
 *
 * assert.deepStrictEqual(safelyDouble(5), Option.some(10))
 * assert.deepStrictEqual(safelyDouble(-5.5), Option.none())
 *
 * // Handling both cases with Option.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     PositiveInt.option(n),
 *     Option.match({
 *       onNone: () => "Not a non-negative integer",
 *       onSome: (positiveInt) => `PositiveInt: ${positiveInt}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "PositiveInt: 42")
 * assert.equal(processNumber(-4.2), "Not a non-negative integer")
 * ```
 *
 * @param n - The `number` to maybe lift into the `PositiveInt`
 * @returns An `Option` containing the `PositiveInt` if valid, `None` otherwise
 * @experimental
 * @see the constructor that does not throw, but returns a {@link Brand.BrandErrors} instead is {@link module:PositiveInt.either}.
 */
export const option: {
  (n: number): _Option.Option<PositiveInt>
} = internal.PositiveIntConstructor.option

/**
 * Lift a `number` in the set of `Either.Right<PositiveInt>` if the number is a
 * valid non-negative integer, `Either.Left<BrandError>` otherwise.
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Either, Option, pipe } from "effect"
 * import * as PositiveInt from "effect/PositiveInt"
 * import * as Int from "effect/Int"
 * import * as assert from "node:assert/strict"
 *
 * // Valid non-negative integers return Right<PositiveInt>
 * assert.deepStrictEqual(
 *   PositiveInt.either(42),
 *   Either.right(PositiveInt.of(42))
 * )
 * assert.deepStrictEqual(
 *   PositiveInt.either(0),
 *   Either.right(PositiveInt.zero)
 * )
 * assert.deepStrictEqual(
 *   PositiveInt.either(-7),
 *   Either.left([
 *     {
 *       message: "Expected -7 to be positive or zero",
 *       meta: undefined
 *     }
 *   ])
 * )
 *
 * // Non-integers return Left<BrandErrors>
 * assert.equal(Either.isLeft(PositiveInt.either(3.14)), true)
 * assert.equal(Either.isLeft(PositiveInt.either(Number.NaN)), true)
 *
 * const Pi = 3.14 as const
 * const floatResult = PositiveInt.either(Pi)
 * if (Either.isLeft(floatResult)) {
 *   assert.deepEqual(
 *     pipe(
 *       Either.getLeft(floatResult),
 *       // Error messages detail the validation failure
 *       Option.map(([{ message }]) => message)
 *     ),
 *     Option.some(`Expected ${Pi} to be an integer`)
 *   )
 * }
 *
 * // Map over valid positiveInt
 * const doubleIfValid = (n: number) =>
 *   pipe(
 *     PositiveInt.either(n),
 *     Either.map((positiveInt) =>
 *       Int.multiply(positiveInt, PositiveInt.of(2))
 *     )
 *   )
 *
 * assert.deepStrictEqual(doubleIfValid(5), Either.right(10))
 * assert.equal(Either.isLeft(doubleIfValid(5.5)), true)
 *
 * // Handle both cases with Either.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     PositiveInt.either(n),
 *     Either.match({
 *       onLeft: ([{ message }]) => `Error: ${message}`,
 *       onRight: (positiveInt) =>
 *         `Valid non-negative integer: ${positiveInt}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "Valid non-negative integer: 42")
 * ```
 *
 * @param n - The number to convert to a PositiveInt
 * @returns An `Either.Right<PositiveInt>` if valid, or
 *   `Either.Left<BrandErrors>` if invalid
 * @experimental
 */
export const either: {
  (n: number): Either.Either<PositiveInt, Brand.Brand.BrandErrors>
} = internal.PositiveIntConstructor.either

/**
 * Constant of `PositiveInt<0>` - the smallest valid non-negative integer
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const zero: PositiveInt = internal.zero

/**
 * Constant of `PositiveInt<1>`
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const one: PositiveInt = internal.one

/**
 * Type guard to test if a value is a `PositiveInt`.
 *
 * This function checks if the provided value is a valid non-negative integer
 * that satisfies the `PositiveInt` brand requirements. It can be used in
 * conditional statements to narrow the type of a value to `PositiveInt`.
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Guards
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as PositiveInt from "effect/PositiveInt"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(PositiveInt.isPositiveInt(0), true)
 * assert.equal(PositiveInt.isPositiveInt(1), true)
 * assert.equal(PositiveInt.isPositiveInt(42), true)
 *
 * // Type narrowing example
 * const processValue = (value: unknown): string => {
 *   if (PositiveInt.isPositiveInt(value)) {
 *     // value is now typed as PositiveInt
 *     return `Valid non-negative integer: ${value}`
 *   }
 *   return "Invalid value"
 * }
 *
 * assert.equal(processValue(5), "Valid non-negative integer: 5")
 * assert.equal(processValue(-5), "Invalid value")
 * assert.equal(processValue(3.14), "Invalid value")
 * assert.equal(processValue("42"), "Invalid value")
 * ```
 *
 * @param input - The value to check
 * @returns `true` if the value is a valid non-negative integer, `false`
 *   otherwise
 * @experimental
 */
export const isPositiveInt: _Predicate.Refinement<unknown, PositiveInt> = (
  input
) => _Predicate.isNumber(input) && internal.PositiveIntConstructor.is(input)

/**
 * Provides an addition operation on `PositiveInt`.
 *
 * The operation preserves the `PositiveInt` type, ensuring that the result is
 * always a valid non-negative integer.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as PositiveInt from "effect/PositiveInt"
 *
 * assert.strictEqual<PositiveInt.PositiveInt>(
 *   pipe(PositiveInt.of(10), PositiveInt.sum(PositiveInt.of(5))),
 *   PositiveInt.sum(PositiveInt.of(10), PositiveInt.of(5))
 * )
 * ```
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const sum: {
  /**
   * Returns a function that adds a specified `that` value to a given `self`
   * value.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import { pipe } from "effect"
   * import * as PositiveInt from "effect/PositiveInt"
   * import * as assert from "node:assert/strict"
   *
   * // Basic addition
   * assert.equal(
   *   pipe(PositiveInt.of(10), PositiveInt.sum(PositiveInt.of(5))),
   *   15
   * )
   *
   * // Chaining multiple additions
   * assert.equal(
   *   pipe(
   *     PositiveInt.of(10),
   *     PositiveInt.sum(PositiveInt.of(20)),
   *     PositiveInt.sum(PositiveInt.of(12))
   *   ),
   *   42
   * )
   *
   * // Using with zero (identity element)
   * assert.equal(
   *   pipe(PositiveInt.of(42), PositiveInt.sum(PositiveInt.zero)),
   *   42
   * )
   * ```
   *
   * @param that - The value to add to `self` when the resultant function is
   *   invoked
   * @returns A function that takes a `self` value and returns the sum of `self`
   *   and `that`
   */
  (that: PositiveInt): (self: PositiveInt) => PositiveInt

  /**
   * Adds two `PositiveInt` values and returns their sum.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as PositiveInt from "effect/PositiveInt"
   * import * as assert from "node:assert/strict"
   *
   * // Basic addition
   * assert.equal(
   *   PositiveInt.sum(PositiveInt.of(10), PositiveInt.of(32)),
   *   42
   * )
   *
   * // Adding zero (identity element)
   * assert.equal(PositiveInt.sum(PositiveInt.of(42), PositiveInt.zero), 42)
   *
   * // Adding large numbers
   * assert.equal(
   *   PositiveInt.sum(
   *     PositiveInt.of(Number.MAX_SAFE_INTEGER - 10),
   *     PositiveInt.of(10)
   *   ),
   *   Number.MAX_SAFE_INTEGER
   * )
   * ```
   *
   * @param self - The first value to add
   * @param that - The second value to add
   * @returns The sum of `self` and `that`
   */
  (self: PositiveInt, that: PositiveInt): PositiveInt
} = dual(
  2,
  (self: PositiveInt, that: PositiveInt): PositiveInt => internal.sum(self, that)
)

/**
 * Subtracts one positive integer from another, returning a number that may not
 * be positive.
 *
 * In the set of natural numbers (ℕ = {0, 1, 2, ...}), subtraction is not a
 * total operation, meaning it's not closed under this set. When b > a, the
 * result of a - b falls outside ℕ. Therefore, this function returns an `Int`
 * rather than a natural number.
 *
 * Mathematical properties of subtraction in natural numbers:
 *
 * - Non-closure: If `a, b ∈ ℕ`, then `a - b` may not ∈ ℕ
 * - Non-commutativity: `a - b ≠ b - a` (unless a = b)
 * - Anti-commutativity: `a - b = -(b - a)`
 * - Non-associativity: `(a - b) - c ≠ a - (b - c)`
 * - Right identity element: `a - 0 = a` for all a ∈ ℕ
 * - No left identity element: There is no `e ∈ ℕ` such that `e - a = a` for all
 *   `a ∈ ℕ`
 * - No inverse elements: For any `a ∈ ℕ` where `a > 0`, there is no `b ∈ ℕ` such
 *   that `a - b = 0 and b - a = 0`
 *
 * @memberof PositiveInt
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const subtract: {
  /**
   * Returns a function that subtracts a specified `subtrahend` from a given
   * `minuend`.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import { pipe } from "effect"
   * import * as Int from "effect/Int"
   * import * as PositiveInt from "effect/PositiveInt"
   * import * as assert from "node:assert/strict"
   *
   * // Basic subtraction
   * assert.equal(
   *   pipe(PositiveInt.of(5), PositiveInt.subtract(PositiveInt.of(3))),
   *   Int.of(2)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   pipe(PositiveInt.of(10), PositiveInt.subtract(PositiveInt.of(10))),
   *   Int.zero
   * )
   *
   * // Subtraction resulting in negative number
   * assert.equal(
   *   pipe(PositiveInt.of(5), PositiveInt.subtract(PositiveInt.of(10))),
   *   Int.of(-5)
   * )
   *
   * // Chaining operations
   * assert.equal(
   *   pipe(
   *     PositiveInt.of(10),
   *     PositiveInt.subtract(PositiveInt.of(5)),
   *     Int.subtract(Int.of(3))
   *   ),
   *   Int.of(2)
   * )
   * ```
   *
   * @param subtrahend - The `PositiveInt` to subtract from the `minuend` when
   *   the resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it.
   */
  (subtrahend: PositiveInt): (minuend: PositiveInt) => Int.Int

  /**
   * Subtracts the `subtrahend` from the `minuend` and returns the difference.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as PositiveInt from "effect/PositiveInt"
   * import * as Int from "effect/Int"
   * import * as assert from "node:assert/strict"
   *
   * // Basic subtraction
   * assert.equal(
   *   PositiveInt.subtract(PositiveInt.of(10), PositiveInt.of(7)),
   *   Int.of(3)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   PositiveInt.subtract(PositiveInt.of(10), PositiveInt.of(10)),
   *   Int.zero
   * )
   *
   * // Subtraction resulting in negative number
   * assert.equal(
   *   PositiveInt.subtract(PositiveInt.of(5), PositiveInt.of(10)),
   *   Int.of(-5)
   * )
   *
   * // Using with zero
   * assert.equal(
   *   PositiveInt.subtract(PositiveInt.of(42), PositiveInt.zero),
   *   Int.of(42),
   *   "Subtracting zero doesn't change the value"
   * )
   *
   * assert.equal(
   *   PositiveInt.subtract(PositiveInt.zero, PositiveInt.of(42)),
   *   Int.of(-42),
   *   "Zero minus a positive number equals the negative of that number"
   * )
   * ```
   *
   * @param minuend - The `PositiveInt` from which another integer is to be
   *   subtracted.
   * @param subtrahend - The `PositiveInt` to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend as
   *   an `Int.Int`.
   */
  (minuend: PositiveInt, subtrahend: PositiveInt): Int.Int
} = dual(
  2,
  (minuend: PositiveInt, subtrahend: PositiveInt): Int.Int => internal.subtract(minuend, subtrahend)
)
