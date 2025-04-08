/**
 * # Natural Numbers (ℕ)
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
 * @module NaturalNumber
 * @since 3.14.6
 * @internal
 * @experimental
 */

import type * as Brand from "./Brand.js"
import type * as Either from "./Either.js"
import { dual } from "./Function.js"
import type * as Integer from "./Integer.js"
import * as internal from "./internal/number.js"
import type * as _Option from "./Option.js"
import * as _Predicate from "./Predicate.js"

/**
 * A type representing non-negative integers (0 -> +Infinity).
 *
 * This is also known as the set of natural numbers (ℕ = {0, 1, 2, ...}).
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * function onlyNaturalNumbers(int: NaturalNumber.NaturalNumber): void {
 *   //... stuff for ONLY non-negative integers FANS
 * }
 *
 * onlyNaturalNumbers(NaturalNumber.of(1)) // ok
 *
 * onlyNaturalNumbers(NaturalNumber.of(0)) // ok too
 *
 * // @ts-expect-error - This will fail because it is not a non-negative integer
 * onlyNaturalNumbers(NaturalNumber.of(-99))
 *
 * // @ts-expect-error - This will fail because 1.5 is not an integer
 * onlyNaturalNumbers(1.5)
 * ```
 *
 * @experimental
 */
export type NaturalNumber = internal.NaturalNumber

/**
 * Lift a number in the set of non-negative integers, and brands it as a
 * `NaturalNumber`. It throws an error if the provided number is not an integer
 * or is negative.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import assert from "node:assert/strict"
 *
 * const aNegativeFloat = -1.5
 *
 * assert.throws(() => {
 *   NaturalNumber.of(aNegativeFloat)
 * }, `Expected ${aNegativeFloat} to be an integer`)
 *
 * assert.throws(() => {
 *   NaturalNumber.of(-1)
 * }, `Expected -1 to be positive or zero`)
 * ```
 *
 * @param n - The number to be lifted in the set of non-negative integers.
 * @returns A NaturalNumber branded type.
 * @experimental
 *
 * @see other constructors that do not throw, but return a {@link Brand.BrandErrors} instead are {@link module:NaturalNumber.option} and {@link module:NaturalNumber.either}
 */
export const of: {
  (n: number): NaturalNumber
} = (n) => internal.NaturalNumberConstructor(n)

/**
 * Lift a `number` in the set of `Option<NaturalNumber>`, and brands it as an
 * `NaturalNumber` if the provided number is a valid non-negative integer. It
 * returns `None` otherwise.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Option, pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * // Valid non-negative integers return Some<NaturalNumber>
 * assert.deepStrictEqual(
 *   NaturalNumber.option(42),
 *   Option.some(NaturalNumber.of(42))
 * )
 * assert.deepStrictEqual(
 *   NaturalNumber.option(0),
 *   Option.some(NaturalNumber.zero)
 * )
 * assert.deepStrictEqual(NaturalNumber.option(-7), Option.none())
 *
 * // Non-integers return None
 * assert.deepStrictEqual(NaturalNumber.option(3.14), Option.none())
 * assert.deepStrictEqual(NaturalNumber.option(Number.NaN), Option.none())
 *
 * // Safe operations on potentially non-integer values
 * const safelyDouble = (n: number) =>
 *   pipe(
 *     NaturalNumber.option(n),
 *     Option.map((positiveInt) =>
 *       NaturalNumber.multiply(positiveInt, NaturalNumber.of(2))
 *     )
 *   )
 *
 * assert.deepStrictEqual(safelyDouble(5), Option.some(10))
 * assert.deepStrictEqual(safelyDouble(-5.5), Option.none())
 *
 * // Handling both cases with Option.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     NaturalNumber.option(n),
 *     Option.match({
 *       onNone: () => "Not a non-negative integer",
 *       onSome: (positiveInt) => `NaturalNumber: ${positiveInt}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "NaturalNumber: 42")
 * assert.equal(processNumber(-4.2), "Not a non-negative integer")
 * ```
 *
 * @param n - The `number` to maybe lift into the `NaturalNumber`
 * @returns An `Option` containing the `NaturalNumber` if valid, `None`
 *   otherwise
 * @experimental
 * @see the constructor that does not throw, but returns a {@link Brand.BrandErrors} instead is {@link module:NaturalNumber.either}.
 */
export const option: {
  (n: number): _Option.Option<NaturalNumber>
} = internal.NaturalNumberConstructor.option

/**
 * Lift a `number` in the set of `Either.Right<NaturalNumber>` if the number is
 * a valid non-negative integer, `Either.Left<BrandError>` otherwise.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Either, Option, pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 * import * as assert from "node:assert/strict"
 *
 * // Valid non-negative integers return Right<NaturalNumber>
 * assert.deepStrictEqual(
 *   NaturalNumber.either(42),
 *   Either.right(NaturalNumber.of(42))
 * )
 * assert.deepStrictEqual(
 *   NaturalNumber.either(0),
 *   Either.right(NaturalNumber.zero)
 * )
 * assert.deepStrictEqual(
 *   NaturalNumber.either(-7),
 *   Either.left([
 *     {
 *       message: "Expected -7 to be positive or zero",
 *       meta: undefined
 *     }
 *   ])
 * )
 *
 * // Non-integers return Left<BrandErrors>
 * assert.equal(Either.isLeft(NaturalNumber.either(3.14)), true)
 * assert.equal(Either.isLeft(NaturalNumber.either(Number.NaN)), true)
 *
 * const Pi = 3.14 as const
 * const floatResult = NaturalNumber.either(Pi)
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
 *     NaturalNumber.either(n),
 *     Either.map((positiveInt) =>
 *       Integer.multiply(positiveInt, NaturalNumber.of(2))
 *     )
 *   )
 *
 * assert.deepStrictEqual(doubleIfValid(5), Either.right(10))
 * assert.equal(Either.isLeft(doubleIfValid(5.5)), true)
 *
 * // Handle both cases with Either.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     NaturalNumber.either(n),
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
 * @param n - The number to convert to a NaturalNumber
 * @returns An `Either.Right<NaturalNumber>` if valid, or
 *   `Either.Left<BrandErrors>` if invalid
 * @experimental
 */
export const either: {
  (n: number): Either.Either<NaturalNumber, Brand.Brand.BrandErrors>
} = internal.NaturalNumberConstructor.either

/**
 * Constant of `NaturalNumber<0>` - the smallest valid non-negative integer
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const zero: NaturalNumber = internal.zero

/**
 * Constant of `NaturalNumber<1>`
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const one: NaturalNumber = internal.one

/**
 * Type guard to test if a value is a `NaturalNumber`.
 *
 * This function checks if the provided value is a valid non-negative integer
 * that satisfies the `NaturalNumber` brand requirements. It can be used in
 * conditional statements to narrow the type of a value to `NaturalNumber`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Guards
 * @example
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(NaturalNumber.isNaturalNumber(0), true)
 * assert.equal(NaturalNumber.isNaturalNumber(1), true)
 * assert.equal(NaturalNumber.isNaturalNumber(42), true)
 *
 * // Type narrowing example
 * const processValue = (value: unknown): string => {
 *   if (NaturalNumber.isNaturalNumber(value)) {
 *     // value is now typed as NaturalNumber
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
export const isNaturalNumber: _Predicate.Refinement<unknown, NaturalNumber> = (
  input
) => _Predicate.isNumber(input) && internal.NaturalNumberConstructor.is(input)

/**
 * Provides an addition operation on `NaturalNumber`.
 *
 * The operation preserves the `NaturalNumber` type, ensuring that the result is
 * always a valid non-negative integer.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * assert.strictEqual<NaturalNumber.NaturalNumber>(
 *   pipe(NaturalNumber.of(10), NaturalNumber.sum(NaturalNumber.of(5))),
 *   NaturalNumber.sum(NaturalNumber.of(10), NaturalNumber.of(5))
 * )
 * ```
 *
 * @memberof NaturalNumber
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
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as assert from "node:assert/strict"
   *
   * // Basic addition
   * assert.equal(
   *   pipe(NaturalNumber.of(10), NaturalNumber.sum(NaturalNumber.of(5))),
   *   15
   * )
   *
   * // Chaining multiple additions
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.sum(NaturalNumber.of(20)),
   *     NaturalNumber.sum(NaturalNumber.of(12))
   *   ),
   *   42
   * )
   *
   * // Using with zero (identity element)
   * assert.equal(
   *   pipe(NaturalNumber.of(42), NaturalNumber.sum(NaturalNumber.zero)),
   *   42
   * )
   * ```
   *
   * @param that - The value to add to `self` when the resultant function is
   *   invoked
   * @returns A function that takes a `self` value and returns the sum of `self`
   *   and `that`
   */
  (that: NaturalNumber): (self: NaturalNumber) => NaturalNumber

  /**
   * Adds two `NaturalNumber` values and returns their sum.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as assert from "node:assert/strict"
   *
   * // Basic addition
   * assert.equal(
   *   NaturalNumber.sum(NaturalNumber.of(10), NaturalNumber.of(32)),
   *   42
   * )
   *
   * // Adding zero (identity element)
   * assert.equal(
   *   NaturalNumber.sum(NaturalNumber.of(42), NaturalNumber.zero),
   *   42
   * )
   *
   * // Adding large numbers
   * assert.equal(
   *   NaturalNumber.sum(
   *     NaturalNumber.of(Number.MAX_SAFE_INTEGER - 10),
   *     NaturalNumber.of(10)
   *   ),
   *   Number.MAX_SAFE_INTEGER
   * )
   * ```
   *
   * @param self - The first value to add
   * @param that - The second value to add
   * @returns The sum of `self` and `that`
   */
  (self: NaturalNumber, that: NaturalNumber): NaturalNumber
} = dual(
  2,
  (self: NaturalNumber, that: NaturalNumber): NaturalNumber => internal.sum(self, that)
)

/**
 * Subtracts one positive integer from another, returning a number that may not
 * be positive.
 *
 * In the set of natural numbers (ℕ = {0, 1, 2, ...}), subtraction is not a
 * total operation, meaning it's not closed under this set. When b > a, the
 * result of a - b falls outside ℕ. Therefore, this function returns an
 * `Integer` rather than a natural number.
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
 * @memberof NaturalNumber
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
   * import * as Integer from "effect/Integer"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as assert from "node:assert/strict"
   *
   * // Basic subtraction
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.subtract(NaturalNumber.of(3))
   *   ),
   *   Integer.of(2)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtract(NaturalNumber.of(10))
   *   ),
   *   Integer.zero
   * )
   *
   * // Subtraction resulting in negative number
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.subtract(NaturalNumber.of(10))
   *   ),
   *   Integer.of(-5)
   * )
   *
   * // Chaining operations
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtract(NaturalNumber.of(5)),
   *     Integer.subtract(Integer.of(3))
   *   ),
   *   Integer.of(2)
   * )
   * ```
   *
   * @param subtrahend - The `NaturalNumber` to subtract from the `minuend` when
   *   the resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it.
   */
  (subtrahend: NaturalNumber): (minuend: NaturalNumber) => Integer.Integer

  /**
   * Subtracts the `subtrahend` from the `minuend` and returns the difference.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   * import * as assert from "node:assert/strict"
   *
   * // Basic subtraction
   * assert.equal(
   *   NaturalNumber.subtract(NaturalNumber.of(10), NaturalNumber.of(7)),
   *   Integer.of(3)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   NaturalNumber.subtract(NaturalNumber.of(10), NaturalNumber.of(10)),
   *   Integer.zero
   * )
   *
   * // Subtraction resulting in negative number
   * assert.equal(
   *   NaturalNumber.subtract(NaturalNumber.of(5), NaturalNumber.of(10)),
   *   Integer.of(-5)
   * )
   *
   * // Using with zero
   * assert.equal(
   *   NaturalNumber.subtract(NaturalNumber.of(42), NaturalNumber.zero),
   *   Integer.of(42),
   *   "Subtracting zero doesn't change the value"
   * )
   *
   * assert.equal(
   *   NaturalNumber.subtract(NaturalNumber.zero, NaturalNumber.of(42)),
   *   Integer.of(-42),
   *   "Zero minus a positive number equals the negative of that number"
   * )
   * ```
   *
   * @param minuend - The `NaturalNumber` from which another integer is to be
   *   subtracted.
   * @param subtrahend - The `NaturalNumber` to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend as
   *   an `Integer.Integer`.
   */
  (minuend: NaturalNumber, subtrahend: NaturalNumber): Integer.Integer
} = dual(
  2,
  (minuend: NaturalNumber, subtrahend: NaturalNumber): Integer.Integer => internal.subtract(minuend, subtrahend)
)
