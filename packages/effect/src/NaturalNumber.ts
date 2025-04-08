/**
 * # Natural Numbers (ℕ)
 *
 * This module provides operations for working with natural numbers ( `ℕ = {0,
 * 1, 2, ...}`).
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
import * as Integer from "./Integer.js"
import * as internal from "./internal/number.js"
import * as _Option from "./Option.js"
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
} = dual(2, internal.sum<NaturalNumber>)

/**
 * Subtracts one natural number from another, mapping from the domain of natural
 * numbers to the codomain of integers to accommodate potentially negative
 * results.
 *
 * @remarks
 * For the subtraction function f: ℕ × ℕ → ℤ defined by f(a, b) = a - b:
 *
 * - **Domain**: The set of ordered pairs of natural numbers (ℕ × ℕ)
 * - **Codomain**: The set of integers (ℤ)
 *
 * Subtraction is not a closed operation on the set of natural numbers (`ℕ = {0,
 * 1, 2, ...}`). When `b > a`, the result of `a - b` is negative, falling
 * outside ℕ. Therefore, this function maps to the codomain of integers rather
 * than remaining within natural numbers.
 *
 * Mathematical properties of subtraction as a function from ℕ × ℕ → ℤ:
 *
 * - Non-closure in ℕ: The image of f is not contained within ℕ
 * - Non-commutativity: `f(a, b) ≠ f(b, a)` (unless a = b)
 * - Anti-commutativity: `f(a, b) = -f(b, a)`
 * - Non-associativity: `f(f(a, b), c) ≠ f(a, f(b, c))`
 * - Right identity element: `f(a, 0) = a` for all `a ∈ ℕ`
 * - No left identity element: There is no `e ∈ ℕ` such that `f(e, a) = a` for all
 *   `a ∈ ℕ`
 * - No inverse elements: For any `a ∈ ℕ` where `a > 0`, there is no `b ∈ ℕ` such
 *   that `f(a, b) = 0` and `f(b, a) = 0`
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const subtractToInteger: {
  /**
   * Returns a function that subtracts a specified `subtrahend` from a given
   * `minuend`, mapping from the domain of natural numbers to the codomain of
   * integers.
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
   *     NaturalNumber.subtractToInteger(NaturalNumber.of(3))
   *   ),
   *   Integer.of(2)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtractToInteger(NaturalNumber.of(10))
   *   ),
   *   Integer.zero
   * )
   *
   * // Subtraction mapping to a negative integer
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.subtractToInteger(NaturalNumber.of(10))
   *   ),
   *   Integer.of(-5)
   * )
   *
   * // Chaining operations
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtractToInteger(NaturalNumber.of(5)),
   *     Integer.subtract(Integer.of(3))
   *   ),
   *   Integer.of(2)
   * )
   * ```
   *
   * @param subtrahend - The `NaturalNumber` to subtract from the `minuend` when
   *   the resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it, as an `Integer`.
   */
  (subtrahend: NaturalNumber): (minuend: NaturalNumber) => Integer.Integer

  /**
   * Subtracts the `subtrahend` from the `minuend` and returns the difference,
   * mapping from the domain of natural numbers to the codomain of integers.
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
   *   NaturalNumber.subtractToInteger(
   *     NaturalNumber.of(10),
   *     NaturalNumber.of(7)
   *   ),
   *   Integer.of(3)
   * )
   *
   * // Subtraction resulting in zero
   * assert.equal(
   *   NaturalNumber.subtractToInteger(
   *     NaturalNumber.of(10),
   *     NaturalNumber.of(10)
   *   ),
   *   Integer.zero
   * )
   *
   * // Subtraction mapping to a negative integer
   * assert.equal(
   *   NaturalNumber.subtractToInteger(
   *     NaturalNumber.of(5),
   *     NaturalNumber.of(10)
   *   ),
   *   Integer.of(-5)
   * )
   *
   * // Using with zero
   * assert.equal(
   *   NaturalNumber.subtractToInteger(
   *     NaturalNumber.of(42),
   *     NaturalNumber.zero
   *   ),
   *   Integer.of(42),
   *   "Subtracting zero doesn't change the value"
   * )
   *
   * assert.equal(
   *   NaturalNumber.subtractToInteger(
   *     NaturalNumber.zero,
   *     NaturalNumber.of(42)
   *   ),
   *   Integer.of(-42),
   *   "Zero minus a positive number equals the negative of that number"
   * )
   * ```
   *
   * @param minuend - The `NaturalNumber` from which another natural number is
   *   to be subtracted.
   * @param subtrahend - The `NaturalNumber` to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend as
   *   an `Integer.Integer`.
   */
  (minuend: NaturalNumber, subtrahend: NaturalNumber): Integer.Integer
} = dual(2, internal.subtract<NaturalNumber, Integer.Integer>)

/**
 * Performs a subtraction operation that maintains closure within the set of
 * natural numbers by returning an Option type.
 *
 * @remarks
 * For the subtraction function f: ℕ × ℕ → Option<ℕ> defined by:
 *
 * - `f(a, b) = Some(a - b)` when `a ≥ b`
 * - `f(a, b) = None` when `a < b`
 * - **Domain**: The set of ordered pairs of natural numbers (ℕ × ℕ)
 * - **Codomain**: Option<ℕ> (an option of natural numbers)
 *
 * Unlike {@link module:NaturalNumber.subtractToInteger}, this operation
 * preserves closure within the natural numbers domain by returning `None` when
 * the result would be negative. This creates **a partial function that is only
 * defined when the `minuend` is greater than or equal to the `subtrahend`**.
 *
 * Mathematical properties of safe subtraction:
 *
 * - Closure in ℕ: When defined (Some case), the result is always in ℕ
 * - Partiality: The function is undefined (None) when minuend < subtrahend
 * - Non-commutativity: `f(a, b) ≠ f(b, a)` (unless a = b)
 * - Non-associativity: `f(f(a, b), c) ≠ f(a, f(b, c))` when both sides are
 *   defined
 * - Right identity element: `f(a, 0) = Some(a)` for all `a ∈ ℕ`
 * - Zero result: `f(a, a) = Some(0)` for all `a ∈ ℕ`
 * - Monotonicity: If `a ≥ b` and `c ≥ d`, then `f(a, c) ≥ f(b, d)` when both are
 *   defined
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const subtractSafe: {
  /**
   * Returns a function that safely subtracts a specified `subtrahend` from a
   * given `minuend`, ensuring the result remains within the natural numbers
   * domain.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe, Option } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * // When minuend > subtrahend, returns Some(result)
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtractSafe(NaturalNumber.of(7))
   *   ),
   *   Option.some(NaturalNumber.of(3))
   * )
   *
   * // When minuend = subtrahend, returns Some(0)
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.subtractSafe(NaturalNumber.of(5))
   *   ),
   *   Option.some(NaturalNumber.zero)
   * )
   *
   * // When minuend < subtrahend, returns None
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(3),
   *     NaturalNumber.subtractSafe(NaturalNumber.of(5))
   *   ),
   *   Option.none()
   * )
   *
   * // Can be used in pipelines with Option functions
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.subtractSafe(NaturalNumber.of(4)),
   *     Option.flatMap((n) =>
   *       NaturalNumber.subtractSafe(n, NaturalNumber.of(3))
   *     ),
   *     Option.map((n) => NaturalNumber.add(n, NaturalNumber.of(2)))
   *   ),
   *   Option.some(NaturalNumber.of(5))
   * )
   * ```
   *
   * @param subtrahend - The `NaturalNumber` to subtract from the `minuend` when
   *   the resultant function is invoked.
   * @returns A function that takes a `minuend` and returns an `Option`
   *   containing the natural number difference if minuend ≥ subtrahend, or None
   *   otherwise.
   */
  (
    subtrahend: NaturalNumber
  ): (minuend: NaturalNumber) => _Option.Option<NaturalNumber>

  /**
   * Safely subtracts the `subtrahend` from the `minuend`, returning an Option
   * that contains the result only if it remains within the natural numbers
   * domain.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * // When minuend > subtrahend, returns Some(result)
   * assert.deepStrictEqual(
   *   NaturalNumber.subtractSafe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.of(7)
   *   ),
   *   Option.some(NaturalNumber.of(3))
   * )
   *
   * // When minuend = subtrahend, returns Some(0)
   * assert.deepStrictEqual(
   *   NaturalNumber.subtractSafe(NaturalNumber.of(5), NaturalNumber.of(5)),
   *   Option.some(NaturalNumber.zero)
   * )
   *
   * // When minuend < subtrahend, returns None
   * assert.deepStrictEqual(
   *   NaturalNumber.subtractSafe(NaturalNumber.of(3), NaturalNumber.of(5)),
   *   Option.none()
   * )
   *
   * // Using with zero
   * assert.deepStrictEqual(
   *   NaturalNumber.subtractSafe(NaturalNumber.of(42), NaturalNumber.zero),
   *   Option.some(NaturalNumber.of(42)),
   *   "Subtracting zero doesn't change the value"
   * )
   *
   * assert.deepStrictEqual(
   *   NaturalNumber.subtractSafe(NaturalNumber.zero, NaturalNumber.zero),
   *   Option.some(NaturalNumber.zero),
   *   "Zero minus zero equals zero"
   * )
   * ```
   *
   * @param minuend - The `NaturalNumber` from which another natural number is
   *   to be subtracted.
   * @param subtrahend - The `NaturalNumber` to subtract from the minuend.
   * @returns An Option containing the natural number difference if minuend ≥
   *   subtrahend, or None if the result would be negative.
   */
  (
    minuend: NaturalNumber,
    subtrahend: NaturalNumber
  ): _Option.Option<NaturalNumber>
} = dual(2, (minuend: NaturalNumber, subtrahend: NaturalNumber) =>
  minuend < subtrahend
    ? _Option.none()
    : _Option.some(internal.subtract(minuend, subtrahend)))

/**
 * Provides a multiplication operation on `NaturalNumber`s.
 *
 * **Multiplication is closed** within the set of natural numbers (ℕ = {0, 1, 2,
 * ...}), meaning the product of any two natural numbers is always a natural
 * number.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * assert.equal(
 *   pipe(
 *     NaturalNumber.of(10),
 *     // data-last API
 *     NaturalNumber.multiply(NaturalNumber.of(5))
 *   ),
 *   // data-first API
 *   NaturalNumber.multiply(NaturalNumber.of(10), NaturalNumber.of(5))
 * )
 * ```
 *
 * Mathematical properties of multiplication in natural numbers:
 *
 * - Closure: If `a, b ∈ ℕ`, then `a × b ∈ ℕ`
 * - Commutativity: `a × b = b × a` for all a, b ∈ ℕ
 * - Associativity: `(a × b) × c = a × (b × c)` for all a, b, c ∈ ℕ
 * - Identity element: `a × 1 = a` for all a ∈ ℕ (1 is the multiplicative
 *   identity)
 * - Absorption element: `a × 0 = 0` for all a ∈ ℕ (0 is the multiplicative
 *   absorbing element)
 * - Distributivity: `a × (b + c) = (a × b) + (a × c)` for all a, b, c ∈ ℕ
 * - No zero divisors: If `a × b = 0`, then either `a = 0` or `b = 0`
 * - No multiplicative inverses: For a > 1, there is no b ∈ ℕ such that a × b = 1
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @param multiplicand - The number to be multiplied
 * @param multiplier - The number of times to multiply
 * @returns The product of the multiplication
 * @experimental
 */
export const multiply: {
  /**
   * Returns a function that multiplies a specified `multiplicand` with a given
   * `multiplier`.
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
   * // Basic multiplication
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.multiply(NaturalNumber.of(3))
   *   ),
   *   15
   * )
   *
   * // Chaining multiple multiplications
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(2),
   *     NaturalNumber.multiply(NaturalNumber.of(3)),
   *     NaturalNumber.multiply(NaturalNumber.of(4))
   *   ),
   *   24
   * )
   *
   * // Using with identity element (one)
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(42),
   *     NaturalNumber.multiply(NaturalNumber.one)
   *   ),
   *   42
   * )
   *
   * // Using with absorbing element (zero)
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(42),
   *     NaturalNumber.multiply(NaturalNumber.zero)
   *   ),
   *   0
   * )
   * ```
   *
   * @param multiplicand - The NaturalNumber to multiply with the `multiplier`
   *   when the resultant function is invoked.
   * @returns A function that takes a `multiplier` and returns the `product` of
   *   multiplying the `multiplier` with the `multiplicand`.
   */
  (multiplicand: NaturalNumber): (multiplier: NaturalNumber) => NaturalNumber

  /**
   * Multiplies two `NaturalNumber` values and returns their product.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as assert from "node:assert/strict"
   *
   * // Basic multiplication
   * assert.equal(
   *   NaturalNumber.multiply(NaturalNumber.of(6), NaturalNumber.of(7)),
   *   42
   * )
   *
   * // Multiplying by one (identity element)
   * assert.equal(
   *   NaturalNumber.multiply(NaturalNumber.of(42), NaturalNumber.one),
   *   42
   * )
   *
   * // Multiplying by zero (absorbing element)
   * assert.equal(
   *   NaturalNumber.multiply(NaturalNumber.of(42), NaturalNumber.zero),
   *   0
   * )
   *
   * // Multiplying large numbers
   * assert.equal(
   *   NaturalNumber.multiply(
   *     NaturalNumber.of(1000),
   *     NaturalNumber.of(1000)
   *   ),
   *   1_000_000
   * )
   * ```
   *
   * @param multiplicand - The number to be multiplied
   * @param multiplier - The number of times to multiply
   * @returns The product of the multiplication
   */
  (multiplier: NaturalNumber, multiplicand: NaturalNumber): NaturalNumber
} = dual(2, internal.multiply<NaturalNumber>)

/**
 * Provides a division operation on `NaturalNumber`s.
 *
 * **Division is not closed** within the set of natural numbers (ℕ = {0, 1, 2,
 * ...}). When the division doesn't result in a natural number, this function
 * still returns the fractional result as a number, but wrapped in an Option.
 *
 * **Syntax**
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   pipe(
 *     NaturalNumber.of(42),
 *     // data-last API
 *     NaturalNumber.divide(NaturalNumber.of(6))
 *   ),
 *   // data-first API
 *   NaturalNumber.divide(NaturalNumber.of(42), NaturalNumber.of(6))
 * )
 *
 * NaturalNumber.divide(NaturalNumber.of(6), NaturalNumber.of(2)) // Some(3)
 * NaturalNumber.divide(NaturalNumber.of(5), NaturalNumber.of(2)) // Some(2.5)
 * NaturalNumber.divide(NaturalNumber.of(0), NaturalNumber.of(5)) // Some(0)
 * NaturalNumber.divide(NaturalNumber.of(5), NaturalNumber.of(0)) // None (division by zero is undefined)
 * ```
 *
 * Mathematical properties of division in natural numbers:
 *
 * - Non-closure: If `a, b ∈ ℕ`, then `a ÷ b` may `not ∈ ℕ`
 * - Non-commutativity: `a ÷ b ≠ b ÷ a` (unless a = b = 1)
 * - Non-associativity: `(a ÷ b) ÷ c ≠ a ÷ (b ÷ c)`
 * - Right identity element: `a ÷ 1 = a` for all `a ∈ ℕ`
 * - No left identity element: There is no `e ∈ ℕ` such that `e ÷ a = a` for all
 *   `a ∈ ℕ`
 * - Division by zero is undefined: `a ÷ 0` is not defined for any a
 * - Not generally distributive over addition: `a ÷ (b + c) ≠ (a ÷ b) + (a ÷ c)`
 *
 * This function returns an `Option` type to handle division by zero, which is
 * mathematically undefined. When the divisor is zero, it returns `None`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @param dividend - The number to be divided
 * @param divisor - The number to divide by
 * @returns `Some<number>` containing the quotient if the divisor is not zero,
 *   `None` if the divisor is 0
 * @experimental
 */
export const divide: {
  /**
   * Returns a function that divides a given `dividend` by a specified
   * `divisor`.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option, pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * // Basic division
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divide(NaturalNumber.of(2))
   *   ),
   *   Option.some(5)
   * )
   *
   * // Division resulting in a fraction
   * assert.deepStrictEqual(
   *   pipe(NaturalNumber.of(5), NaturalNumber.divide(NaturalNumber.of(2))),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   pipe(NaturalNumber.of(5), NaturalNumber.divide(NaturalNumber.zero)),
   *   Option.none()
   * )
   *
   * // Chaining operations
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divide(NaturalNumber.of(2)),
   *     Option.flatMap((result) =>
   *       pipe(
   *         NaturalNumber.option(result),
   *         Option.flatMap(NaturalNumber.divide(NaturalNumber.of(5)))
   *       )
   *     )
   *   ),
   *   Option.some(1)
   * )
   * ```
   *
   * @param divisor - The `NaturalNumber` to divide the `dividend` by when the
   *   resultant function is invoked
   * @returns A function that takes a `dividend` and returns an `Option`
   *   containing the quotient if the divisor is not zero, `None` if the divisor
   *   is 0
   */
  (divisor: NaturalNumber): (dividend: NaturalNumber) => _Option.Option<number>

  /**
   * Divides the `dividend` by the `divisor` and returns an `Option` containing
   * the quotient.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import { Option } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * // Basic division
   * assert.deepStrictEqual(
   *   NaturalNumber.divide(NaturalNumber.of(6), NaturalNumber.of(3)),
   *   Option.some(2)
   * )
   *
   * // Division resulting in a fraction
   * assert.deepStrictEqual(
   *   NaturalNumber.divide(NaturalNumber.of(5), NaturalNumber.of(2)),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   NaturalNumber.divide(NaturalNumber.of(5), NaturalNumber.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend
   * assert.deepStrictEqual(
   *   NaturalNumber.divide(NaturalNumber.zero, NaturalNumber.of(5)),
   *   Option.some(0)
   * )
   * ```
   *
   * @param dividend - The `NaturalNumber` to be divided
   * @param divisor - The `NaturalNumber` to divide by
   * @returns An `Option` containing the quotient if the divisor is not zero,
   *   `None` if the divisor is 0
   */
  (dividend: NaturalNumber, divisor: NaturalNumber): _Option.Option<number>
} = dual(2, internal.divide<NaturalNumber, number>)

/**
 * Performs an unsafe division operation on `NaturalNumber`s, returning a
 * `number` result.
 *
 * **Division is not closed** within the set of natural numbers (`ℕ = {0, 1, 2,
 * ...}`). This operation returns the exact quotient as a number, which may be a
 * fractional value.
 *
 * Mathematical properties of division in natural numbers:
 *
 * - Non-closure: If `a, b ∈ ℕ`, then `a ÷ b` may `not ∈ ℕ`
 * - Non-commutativity: `a ÷ b ≠ b ÷ a` (unless a = b = 1)
 * - Non-associativity: `(a ÷ b) ÷ c ≠ a ÷ (b ÷ c)`
 * - Right identity element: `a ÷ 1 = a` for all `a ∈ ℕ`
 * - No left identity element: There is no `e ∈ ℕ` such that `e ÷ a = a` for all
 *   `a ∈ ℕ`
 * - Division by zero is undefined: `a ÷ 0` is not defined for any a
 *
 * Unlike the safe {@link module:NaturalNumber.divide} operation which returns an
 * `Option`, this function will throw a {@link module:Number.DivisionByZeroError}
 * if the divisor is zero.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @throws - A {@link module:Number.DivisionByZeroError} if the divisor is zero.
 * @experimental
 */
export const unsafeDivide: {
  /**
   * Divides by the given `divisor`.
   *
   * @example
   *
   * ```ts
   * import { pipe } from "effect"
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(6),
   *     NaturalNumber.unsafeDivide(NaturalNumber.of(2))
   *   ),
   *   3
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.unsafeDivide(NaturalNumber.of(2))
   *   ),
   *   2.5
   * )
   *
   * // The following throws DivisionByZeroError
   * assert.throws(() =>
   *   pipe(
   *     NaturalNumber.of(6),
   *     NaturalNumber.unsafeDivide(NaturalNumber.zero)
   *   )
   * )
   * ```
   *
   * @param divisor - The `NaturalNumber` by which the `dividend` will be
   *   divided.
   * @returns A function that takes a `dividend` and returns the quotient as a
   *   `number`.
   * @throws - A {@link module:Number.DivisionByZeroError} if the divisor is
   *   zero.
   */
  (divisor: NaturalNumber): (dividend: NaturalNumber) => number

  /**
   * Divides the `dividend` by the `divisor`.
   *
   * @example
   *
   * ```ts
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   NaturalNumber.unsafeDivide(NaturalNumber.of(6), NaturalNumber.of(2)),
   *   3
   * )
   *
   * assert.equal(
   *   NaturalNumber.unsafeDivide(NaturalNumber.of(5), NaturalNumber.of(2)),
   *   2.5
   * )
   *
   * // The following throws DivisionByZeroError
   * assert.throws(() =>
   *   NaturalNumber.unsafeDivide(NaturalNumber.of(6), NaturalNumber.zero)
   * )
   * ```
   *
   * @param dividend - The `NaturalNumber` to be divided.
   * @param divisor - The `NaturalNumber` by which the dividend is divided.
   * @returns The quotient of the division as a `number`.
   * @throws - A {@link module:Number.DivisionByZeroError} if the divisor is
   *   zero.
   */
  (dividend: NaturalNumber, divisor: NaturalNumber): number
} = dual(2, internal.unsafeDivide<NaturalNumber, number>)

/**
 * Returns the result of adding one to the given `NaturalNumber`.
 *
 * Increment is a special case of addition that adds one to a natural number.
 * **This operation is closed** within the set of natural numbers (`ℕ = {0, 1,
 * 2, ...}`), meaning the result is always a natural number.
 *
 * Mathematical properties of increment in natural numbers:
 *
 * - Closure: If `n ∈ ℕ`, then `increment(n) ∈ ℕ`
 * - Injective: If `increment(a) = increment(b)`, then `a = b`
 * - No fixed points: increment(n) ≠ n for all n ∈ ℕ
 * - Successor function: increment defines the successor for each natural number
 * - Relation to addition: `increment(n) = n + 1`
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 *
 * assert.strictEqual<NaturalNumber.NaturalNumber>(
 *   NaturalNumber.increment(NaturalNumber.of(1)),
 *   NaturalNumber.of(2)
 * )
 *
 * assert.strictEqual<NaturalNumber.NaturalNumber>(
 *   pipe(
 *     NaturalNumber.zero,
 *     NaturalNumber.increment,
 *     NaturalNumber.increment,
 *     NaturalNumber.increment,
 *     NaturalNumber.increment
 *   ),
 *   NaturalNumber.of(4)
 * )
 * ```
 *
 * @param n - The NaturalNumber value to be incremented.
 * @returns The successor of n as a `NaturalNumber`.
 * @experimental
 */
export const increment: (n: NaturalNumber) => NaturalNumber = internal.increment

/**
 * Returns the result of subtracting one from the given `NaturalNumber`, widened
 * to an `Integer`.
 *
 * `decrementToInteger` is a convenience function that widens the domain to
 * Integers, as the decrement operation is not closed within the set of natural
 * numbers (`ℕ = {0, 1, 2, ...}`). Decrementing 0 produces -1, which is outside
 * ℕ. Therefore, the return type is an `Integer` to accommodate all possible
 * results.
 *
 * Mathematical properties of decrement on natural numbers:
 *
 * - Non-closure: If `n = 0`, then `decrementToInteger(n) ∉ ℕ`
 * - Injective: If `decrementToInteger(a) = decrementToInteger(b)`, then `a = b`
 * - Inverse of increment: `decrementToInteger(increment(n)) = n` for all `n ∈ ℕ`
 * - Predecessor function: decrementToInteger defines the predecessor for each
 *   natural number, but widens to Integer type
 * - Relation to subtraction: `decrementToInteger(n) = n - 1`
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 *
 * assert.strictEqual(
 *   NaturalNumber.decrementToInteger(NaturalNumber.of(0)),
 *   Integer.of(-1)
 * )
 *
 * assert.strictEqual(
 *   pipe(
 *     NaturalNumber.of(100),
 *     NaturalNumber.decrementToInteger,
 *     Integer.decrement,
 *     Integer.decrement,
 *     Integer.decrement
 *   ),
 *   Integer.of(96)
 * )
 * ```
 *
 * @param n - The `NaturalNumber` to be decremented.
 * @returns The predecessor of n as an `Integer` (which may be negative when n =
 *   0).
 * @experimental
 */
export const decrementToInteger: (n: NaturalNumber) => Integer.Integer = Integer.decrement

/**
 * Returns the result of decrementing a natural number, ensuring the result
 * remains within the domain of natural numbers through the Option type.
 *
 * @remarks
 * Unlike {@link module:NaturalNumber.decrementToInteger}, this operation
 * maintains closure within the set of natural numbers (`ℕ = {0, 1, 2, ...}`) by
 * returning `None` when decrementing would produce a value outside the domain
 * (specifically, when decrementing 0).
 *
 * Mathematical properties of safe decrement on natural numbers:
 *
 * - Domain preservation: For all `n ∈ ℕ`, `decrementSafe(n)` is either `Some(m)`
 *   where `m ∈ ℕ` or `None`
 * - Partiality: `decrementSafe(0) = None` and `decrementSafe(n) = Some(n-1)` for
 *   all `n > 0`
 * - Injective (where defined): If `decrementSafe(a) = Some(x)` and
 *   `decrementSafe(b) = Some(x)`, then `a = b`
 * - Inverse of increment: For all `n ∈ ℕ`, `decrementSafe(increment(n)) =
 *   Some(n)`
 * - Non-totality: Unlike `decrementToInteger`, this function is not defined for
 *   all inputs
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe, Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * // When decrementing a positive natural number, returns Some(result)
 * assert.deepStrictEqual(
 *   NaturalNumber.decrementSafe(NaturalNumber.of(5)),
 *   Option.some(NaturalNumber.of(4))
 * )
 *
 * // When decrementing 0, returns None as the result would be outside ℕ
 * assert.deepStrictEqual(
 *   NaturalNumber.decrementSafe(NaturalNumber.zero),
 *   Option.none()
 * )
 *
 * // Can be used in pipelines with Option functions
 * assert.deepStrictEqual(
 *   pipe(
 *     NaturalNumber.of(3),
 *     NaturalNumber.decrementSafe,
 *     Option.flatMap(NaturalNumber.decrementSafe),
 *     Option.map((n) => NaturalNumber.add(n, NaturalNumber.of(5)))
 *   ),
 *   Option.some(NaturalNumber.of(6))
 * )
 * ```
 *
 * @param n - The `NaturalNumber` to safely decrement.
 * @returns `Some<NaturalNumber>` containing the decremented value if `n > 0`,
 *   or `None` if `n = 0`
 * @experimental
 */
export const decrementSafe: {
  (n: NaturalNumber): _Option.Option<NaturalNumber>
} = (n) => (n >= 1 ? _Option.some(internal.decrement(n)) : _Option.none())
