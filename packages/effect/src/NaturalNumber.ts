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
import * as _Equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as Integer from "./Integer.js"
import * as internal from "./internal/number.js"
import * as _Option from "./Option.js"
import * as _Order from "./Order.js"
import * as _Predicate from "./Predicate.js"
import * as _Schema from "./Schema.js"

/**
 * A type representing non-negative integers (0 -> +Infinity).
 *
 * This is also known as the set of natural numbers (`ℕ = {0, 1, 2, ...}`).
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
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
 * onlyNaturalNumbers(Integer.of(-99))
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
 * A Schema for NaturalNumber values.
 *
 * This Schema allows for seamless integration between the `NaturalNumber`
 * module and the `Schema` module, enabling validation, parsing, and composition
 * of NaturalNumber values within the Schema ecosystem.
 *
 * @remarks
 * The NaturalNumber.Schema serves as a bridge between the "pure" world of the
 * NaturalNumber module and the Schema module, allowing you to leverage all the
 * benefits that Schema provides such as:
 *
 * - Validation and parsing of input data
 * - Composition with other schemas
 * - Integration with Schema combinators
 * - Type-safe transformations
 *
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { pipe, flow, Schema, Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * // Decode a number to a NaturalNumber
 * const result: NaturalNumber.NaturalNumber = pipe(
 *   42,
 *   Schema.decodeUnknownSync(NaturalNumber.Schema)
 * ) // NaturalNumber or throws an error
 *
 * // Combine with other Schema operations
 * const isNaturalNumber = Schema.is(NaturalNumber.Schema)
 * isNaturalNumber(42) // true
 * isNaturalNumber(-1) // false
 * isNaturalNumber(3.14) // false
 *
 * // Use in a pipeline with NaturalNumber operations
 * const process = flow(
 *   Schema.decodeUnknownOption(NaturalNumber.Schema),
 *   Option.flatMap(
 *     flow(
 *       NaturalNumber.multiply(NaturalNumber.of(2)),
 *       NaturalNumber.sum(NaturalNumber.of(10)),
 *       NaturalNumber.divideSafe(NaturalNumber.of(5))
 *     )
 *   )
 * )
 *
 * process(5) // Some(4) - ((5 * 2) + 10) / 5 = 20 / 5 = 4
 * process(-1) // None - not a natural number
 * process(3.14) // None - not an integer
 * ```
 */
export const Schema: _Schema.Schema<NaturalNumber, number> = _Schema.Number.pipe(
  _Schema.fromBrand(internal.NaturalNumberConstructor)
)

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
 * Takes an `Iterable` of `NaturalNumber`s and returns their sum as a single
 * `NaturalNumber`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Iterable from "effect/Iterable"
 *
 * assert.equal<NaturalNumber.NaturalNumber>(
 *   NaturalNumber.sumAll(
 *     Iterable.makeBy((n) => NaturalNumber.of(n * 2), { length: 5 }) // Iterable<NaturalNumber>
 *   ),
 *   NaturalNumber.of(20)
 * )
 * ```
 *
 * @param collection - An `Iterable<NaturalNumber>` to reduce to a sum.
 * @returns The sum of the `NaturalNumber`s in the `Iterable`.
 * @experimental
 */
export const sumAll: {
  (collection: Iterable<NaturalNumber>): NaturalNumber
} = internal.sumAll<NaturalNumber>

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
 * Takes an `Iterable` of `NaturalNumber`s and returns their multiplication as a
 * single `NaturalNumber`.
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
 * import * as Iterable from "effect/Iterable"
 *
 * assert.equal<NaturalNumber.NaturalNumber>(
 *   NaturalNumber.multiplyAll(
 *     Iterable.makeBy(
 *       (n) =>
 *         pipe(
 *           n as NaturalNumber.NaturalNumber, // 0, 1, 2, 3, 4,
 *           NaturalNumber.increment, // 1, 2, 3, 4, 5
 *           NaturalNumber.multiply(NaturalNumber.of(2)) // 2, 4, 6, 8, 10
 *         ),
 *       { length: 5 }
 *     ) // Iterable<NaturalNumber>
 *   ),
 *   NaturalNumber.of(3_840)
 * )
 * ```
 *
 * @param collection - An `Iterable<NaturalNumber>` to reduce to a product.
 * @returns The product of the `Integer`s in the `Iterable`.
 * @experimental
 */
export const multiplyAll: {
  (collection: Iterable<NaturalNumber>): NaturalNumber
} = internal.multiplyAll<NaturalNumber>

/**
 * Divides one natural number by another, mapping from the domain of `natural
 * numbers` to the codomain of `real numbers` (represented as JavaScript's
 * number type) to accommodate possible fractional results.
 *
 * For the division function `f: ℕ × ℕ → Option<ℝ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0`
 * - `f(a, 0) = None` (division by zero is undefined)
 * - **Domain**: The set of ordered pairs of natural numbers (`ℕ × ℕ`)
 * - **Codomain**: `Option<ℝ>` (an option of real numbers)
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe, type Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * assert.deepStrictEqual<Option.Option<number>>(
 *   pipe(
 *     NaturalNumber.of(42),
 *     // data-last API
 *     NaturalNumber.divideToNumber(NaturalNumber.of(6))
 *   ),
 *   // data-first API
 *   NaturalNumber.divideToNumber(NaturalNumber.of(42), NaturalNumber.of(6))
 * )
 *
 * NaturalNumber.divideToNumber(NaturalNumber.of(6), NaturalNumber.of(2)) // Some(3)
 * NaturalNumber.divideToNumber(NaturalNumber.of(5), NaturalNumber.of(2)) // Some(2.5)
 * NaturalNumber.divideToNumber(NaturalNumber.of(0), NaturalNumber.of(5)) // Some(0)
 * NaturalNumber.divideToNumber(NaturalNumber.of(5), NaturalNumber.of(0)) // None (division by zero is undefined)
 * ```
 *
 * @remarks
 * **Division is not a closed operation within the set of natural numbers** (`ℕ
 * = {0, 1, 2, ...}`).
 *
 * When division doesn't yield a whole number, the result is a fractional number
 * outside ℕ. This function widens to JavaScript's number type (representing ℝ)
 * to accommodate all possible results, and returns an Option to handle the
 * undefined case of division by zero.
 *
 * Mathematical properties of division on natural numbers:
 *
 * - Non-closure in ℕ: The image of f is not contained within ℕ
 * - Partiality: Division by zero is undefined (represented as None)
 * - Non-commutativity: `f(a, b) ≠ f(b, a)` (`unless a = b = 1`)
 * - Non-associativity: `f(f(a, b), c) ≠ f(a, f(b, c))` when all are defined
 * - Right identity element: `f(a, 1) = Some(a)` for all `a ∈ ℕ`
 * - No left identity element: There is no `e ∈ ℕ` such that `f(e, a) = Some(a)`
 *   for all `a ∈ ℕ`
 * - Not generally distributive over addition: `f(a, (b + c)) ≠ f(a, b) + f(a, c)`
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divideToNumber: {
  /**
   * Returns a function that divides a given `dividend` by a specified
   * `divisor`, mapping to the real number domain.
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
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divideToNumber(NaturalNumber.of(2))
   *   ),
   *   Option.some(5)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.divideToNumber(NaturalNumber.of(2))
   *   ),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.divideToNumber(NaturalNumber.zero)
   *   ),
   *   Option.none()
   * )
   *
   * // Chaining operations
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divideToNumber(NaturalNumber.of(2)),
   *     Option.flatMap((result) =>
   *       pipe(
   *         NaturalNumber.option(result),
   *         Option.flatMap(
   *           NaturalNumber.divideToNumber(NaturalNumber.of(5))
   *         )
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
   * the quotient, mapping from natural numbers to real numbers.
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
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   NaturalNumber.divideToNumber(
   *     NaturalNumber.of(6),
   *     NaturalNumber.of(3)
   *   ),
   *   Option.some(2)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   NaturalNumber.divideToNumber(
   *     NaturalNumber.of(5),
   *     NaturalNumber.of(2)
   *   ),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   NaturalNumber.divideToNumber(
   *     NaturalNumber.of(5),
   *     NaturalNumber.zero
   *   ),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend
   * assert.deepStrictEqual(
   *   NaturalNumber.divideToNumber(
   *     NaturalNumber.zero,
   *     NaturalNumber.of(5)
   *   ),
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
 * Implements **division as a partial function on natural numbers** that ensures
 * the closure property, that results remain within the set of natural numbers
 * (`ℕ`), by returning None when the result would fall outside ℕ.
 *
 * For the division function `f: ℕ × ℕ → Option<ℕ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0` and `a` is _exactly divisible_ by `b`
 * - `f(a, b) = None` when `b = 0` or `a` is _not exactly divisible_ by `b`
 * - **Domain**: The set of ordered pairs of natural numbers (`ℕ × ℕ`)
 * - **Codomain**: `Option<ℕ>` (an option of natural numbers)
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe, Option } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * assert.deepStrictEqual<Option.Option<NaturalNumber.NaturalNumber>>(
 *   // data-last API
 *   pipe(
 *     NaturalNumber.of(42),
 *     NaturalNumber.divideSafe(NaturalNumber.of(6))
 *   ),
 *   // data-first API
 *   NaturalNumber.divideSafe(NaturalNumber.of(42), NaturalNumber.of(6))
 * )
 *
 * // Mixing with other operations
 * console.log(
 *   pipe(
 *     NaturalNumber.of(12),
 *     NaturalNumber.divideSafe(NaturalNumber.of(4)), // Some(3)
 *     Option.flatMap(NaturalNumber.subtractSafe(NaturalNumber.one)), // Some(2)
 *     Option.flatMap(NaturalNumber.divideSafe(NaturalNumber.of(2))), // Some(1)
 *     Option.flatMap(NaturalNumber.decrementSafe) // Some(0)
 *   )
 * )
 * ```
 *
 * @remarks
 * Unlike {@link module:NaturalNumber.divideToNumber}, this operation preserves
 * closure within the natural numbers domain by returning `None` when the result
 * would be fractional or when division is undefined. This creates a partial
 * function that is only defined when the divisor is non-zero and the dividend
 * is exactly divisible by the divisor.
 *
 * Mathematical properties of safe division:
 *
 * - **Closure in `ℕ`**: When defined (Some case), the result is always in ℕ
 * - **Partiality**: The function is undefined (None) when divisor = 0 or when
 *   division would yield a fraction
 * - **Non-commutativity**: `f(a, b) ≠ f(b, a)` (unless `a = b = 0` or `a = b =
 *   1`)
 * - **Non-associativity**: `f(f(a, b), c) ≠ f(a, f(b, c))` when both sides are
 *   defined
 * - **Right identity element**: `f(a, 1) = Some(a)` for all `a ∈ ℕ`
 * - **Divisibility property**: `f(a, b) = Some(q)` if and only if `a = b × q` for
 *   some `q ∈ ℕ`
 * - **Quotient uniqueness**: If `f(a, b) = Some(q)`, then `q` is the unique
 *   natural number such that `a = b × q`
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divideSafe: {
  /**
   * Returns a function that safely divides a given `dividend` by a specified
   * `divisor`, ensuring the result remains within the natural numbers domain.
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
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divideSafe(NaturalNumber.of(2))
   *   ),
   *   Option.some(NaturalNumber.of(5))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.divideSafe(NaturalNumber.of(2))
   *   ),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(10),
   *     NaturalNumber.divideSafe(NaturalNumber.zero)
   *   ),
   *   Option.none()
   * )
   *
   * // Can be used in pipelines with Option functions
   * assert.deepStrictEqual(
   *   pipe(
   *     NaturalNumber.of(12),
   *     NaturalNumber.divideSafe(NaturalNumber.of(4)),
   *     Option.flatMap((n) =>
   *       NaturalNumber.divideSafe(n, NaturalNumber.of(3))
   *     ),
   *     Option.map((n) => NaturalNumber.add(n, NaturalNumber.of(2)))
   *   ),
   *   Option.some(NaturalNumber.of(3))
   * )
   * ```
   *
   * @param divisor - The `NaturalNumber` to divide the `dividend` by when the
   *   resultant function is invoked.
   * @returns A function that takes a `dividend` and returns an Option
   *   containing the natural number quotient if the divisor is non-zero and the
   *   division yields a natural number, or None otherwise.
   */
  (
    divisor: NaturalNumber
  ): (dividend: NaturalNumber) => _Option.Option<NaturalNumber>

  /**
   * Safely divides the `dividend` by the `divisor`, returning an Option that
   * contains the result only if it remains within the natural numbers domain.
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
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   NaturalNumber.divideSafe(NaturalNumber.of(6), NaturalNumber.of(3)),
   *   Option.some(NaturalNumber.of(2))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   NaturalNumber.divideSafe(NaturalNumber.of(5), NaturalNumber.of(2)),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   NaturalNumber.divideSafe(NaturalNumber.of(10), NaturalNumber.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend and non-zero divisor
   * assert.deepStrictEqual(
   *   NaturalNumber.divideSafe(NaturalNumber.zero, NaturalNumber.of(5)),
   *   Option.some(NaturalNumber.zero),
   *   "Zero divided by any non-zero natural number equals zero"
   * )
   *
   * // Division when both operands are zero
   * assert.deepStrictEqual(
   *   NaturalNumber.divideSafe(NaturalNumber.zero, NaturalNumber.zero),
   *   Option.none(),
   *   "Division by zero is undefined, even when the dividend is also zero"
   * )
   * ```
   *
   * @param dividend - The `NaturalNumber` to be divided.
   * @param divisor - The `NaturalNumber` to divide by.
   * @returns An Option containing the natural number quotient if the divisor is
   *   non-zero and the division yields a natural number, or None if the divisor
   *   is zero or the division would result in a fraction.
   */
  (
    dividend: NaturalNumber,
    divisor: NaturalNumber
  ): _Option.Option<NaturalNumber>
} = dual(
  2,
  (
    dividend: NaturalNumber,
    divisor: NaturalNumber
  ): _Option.Option<NaturalNumber> => {
    if (divisor === 0) {
      return _Option.none()
    }

    if (dividend % divisor !== 0) {
      return _Option.none()
    }

    return option(dividend / divisor)
  }
)

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
 *     Option.map((n) => NaturalNumber.sum(n, NaturalNumber.of(5)))
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

/**
 * Type class instance of `Equivalence` for `NaturalNumber`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   NaturalNumber.Equivalence(NaturalNumber.of(1), NaturalNumber.of(1)),
 *   true
 * )
 * assert.equal(
 *   NaturalNumber.Equivalence(NaturalNumber.of(1), NaturalNumber.of(2)),
 *   false
 * )
 *
 * assert(
 *   // @ts-expect-error - It is not allowed to compare different types
 *   NaturalNumber.Equivalence(Integer.one, NaturalNumber.one),
 *   "Won't compile because Integer is not a NaturalNumber"
 * )
 *
 * // if you need to compare wider types, use the `Integer.Equivalence` instance
 * assert(
 *   Integer.Equivalence(NaturalNumber.one, Integer.one),
 *   "Comparing Integer with NaturalNumber should work"
 * )
 * ```
 *
 * @param a - The first `NaturalNumber` to compare.
 * @param b - The second `NaturalNumber` to compare.
 * @returns `true` if the two `NaturalNumber`s are equal (have the same value),
 *   `false` otherwise.
 * @experimental
 */
export const Equivalence: _Equivalence.Equivalence<NaturalNumber> = _Equivalence.number

/**
 * Type class instance of `Order` for `NaturalNumber`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   NaturalNumber.Order(NaturalNumber.one, NaturalNumber.of(2)),
 *   -1
 * )
 *
 * assert.equal(
 *   NaturalNumber.Order(NaturalNumber.of(2), NaturalNumber.of(2)),
 *   0
 * )
 *
 * assert.equal(
 *   NaturalNumber.Order(NaturalNumber.of(2), NaturalNumber.one),
 *   1
 * )
 *
 * assert.equal(
 *   // @ts-expect-error - It is not allowed to order with different types
 *   NaturalNumber.Order(Integer.one, NaturalNumber.one),
 *   0,
 *   "Won't compile because Integer is not a NaturalNumber"
 * )
 *
 * // if you need to order wider types, use a wider ordering instance such as `Integer.Order`
 * assert.equal(
 *   Integer.Order(NaturalNumber.one, Integer.of(-100)),
 *   1,
 *   "Ordering Integer with NaturalNumber should work"
 * )
 * ```
 *
 * @param self - The first `Integer` to compare.
 * @param that - The second `Integer` to compare.
 * @returns `-1` if self is **less** than that, `0` if they are **equal**, and
 *   `1` if self is **greater** than that.
 * @experimental
 */
export const Order: _Order.Order<NaturalNumber> = _Order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise
 * `false`.
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   NaturalNumber.lessThan(NaturalNumber.of(2), NaturalNumber.of(3)),
 *   true
 * )
 *
 * assert.equal(
 *   pipe(NaturalNumber.of(3), NaturalNumber.lessThan(NaturalNumber.of(3))),
 *   false
 * )
 *
 * assert.equal(
 *   pipe(Integer.of(-1), Integer.lessThan(NaturalNumber.of(3))),
 *   true,
 *   "when comparing different number types, you need to choose a wider operator instance such as Integer.lessThan"
 * )
 * ```
 *
 * @experimental
 */
export const lessThan: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(2), //
   *     NaturalNumber.lessThan(NaturalNumber.of(3))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(3), //
   *     NaturalNumber.lessThan(NaturalNumber.of(3))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(4), //
   *     NaturalNumber.lessThan(NaturalNumber.of(3))
   *   ),
   *   false
   * )
   * ```
   */
  (that: NaturalNumber): (self: NaturalNumber) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   NaturalNumber.lessThan(NaturalNumber.of(2), NaturalNumber.of(3)),
   *   true
   * )
   *
   * assert.equal(
   *   NaturalNumber.lessThan(NaturalNumber.of(3), NaturalNumber.of(3)),
   *   false
   * )
   *
   * assert.equal(
   *   NaturalNumber.lessThan(NaturalNumber.of(4), NaturalNumber.of(3)),
   *   false
   * )
   * ```
   */
  (self: NaturalNumber, that: NaturalNumber): boolean
} = _Order.lessThan(Order)

/**
 * Returns a function that checks if a given `NaturalNumber` is less than or
 * equal to the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 * import { pipe } from "effect"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     NaturalNumber.of(2),
 *     NaturalNumber.lessThanOrEqualTo(NaturalNumber.of(3))
 *   ),
 *   // data-first api
 *   NaturalNumber.lessThanOrEqualTo(
 *     NaturalNumber.of(2),
 *     NaturalNumber.of(3)
 *   )
 * )
 *
 * assert(
 *   Integer.lessThanOrEqualTo(Integer.of(-2), NaturalNumber.of(3)),
 *   "when comparing different number types, you need to choose a wider operator instance such as Integer.lessThanOrEqualTo"
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const lessThanOrEqualTo: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert(
   *   pipe(
   *     NaturalNumber.of(3), //
   *     NaturalNumber.lessThanOrEqualTo(NaturalNumber.of(2))
   *   )
   * )
   *
   * assert(
   *   pipe(
   *     NaturalNumber.of(3), //
   *     NaturalNumber.lessThanOrEqualTo(NaturalNumber.of(3))
   *   )
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(3), //
   *     NaturalNumber.lessThanOrEqualTo(NaturalNumber.of(4))
   *   ),
   *   false
   * )
   * ```
   *
   * @param that - The `NaturalNumber` to compare with the `self` when the
   *   resultant function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   less than or equal to `that`, otherwise `false`.
   */
  (that: NaturalNumber): (self: NaturalNumber) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert(
   *   NaturalNumber.lessThanOrEqualTo(
   *     NaturalNumber.of(2),
   *     NaturalNumber.of(3)
   *   )
   * )
   *
   * assert(
   *   NaturalNumber.lessThanOrEqualTo(
   *     NaturalNumber.of(3),
   *     NaturalNumber.of(3)
   *   )
   * )
   *
   * assert.equal(
   *   NaturalNumber.lessThanOrEqualTo(
   *     NaturalNumber.of(4),
   *     NaturalNumber.of(3)
   *   ),
   *   false
   * )
   * ```
   *
   * @param self - The first `NaturalNumber` to compare.
   * @param that - The second `NaturalNumber` to compare.
   * @returns `true` if `self` is less than or equal to `that`, otherwise
   *   `false`.
   */
  (self: NaturalNumber, that: NaturalNumber): boolean
} = _Order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first `NaturalNumber` is greater than the second
 * `NaturalNumber`, otherwise `false`.
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
 *     // data-last api
 *     NaturalNumber.of(3),
 *     NaturalNumber.greaterThan(NaturalNumber.of(2))
 *   ),
 *   // data-first api
 *   NaturalNumber.greaterThan(NaturalNumber.of(3), NaturalNumber.of(2))
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const greaterThan: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   NaturalNumber(
   *     NaturalNumber.of(4),
   *     NaturalNumber.greaterThan(NaturalNumber.of(2))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(NaturalNumber.of(0), Integer.greaterThan(Integer.of(-1))),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(0),
   *     NaturalNumber.greaterThan(NaturalNumber.of(3))
   *   ),
   *   false
   * )
   * ```
   *
   * @param that - The `NaturalNumber` to compare with the `self` when the
   *   resultant function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than `that`, otherwise `false`.
   */
  (that: NaturalNumber): (self: NaturalNumber) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   NaturalNumber.greaterThan(NaturalNumber.of(4), NaturalNumber.of(2)),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.greaterThan(Integer.of(-2), NaturalNumber.of(0)),
   *   false
   * )
   *
   * assert.equal(
   *   NaturalNumber.greaterThan(NaturalNumber.of(2), NaturalNumber.of(2)),
   *   false
   * )
   * ```
   *
   * @param self - The first `NaturalNumber` value to compare.
   * @param that - The second `NaturalNumber` value to compare.
   * @returns A `boolean` indicating whether `self` was greater than `that`.
   */
  (self: NaturalNumber, that: NaturalNumber): boolean
} = _Order.greaterThan(Order)

/**
 * Returns a function that checks if a given `NaturalNumber` is greater than or
 * equal to the provided one.
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
 *     // data-last api
 *     NaturalNumber.of(3),
 *     NaturalNumber.greaterThanOrEqualTo(NaturalNumber.of(2))
 *   ),
 *   // data-first api
 *   NaturalNumber.greaterThanOrEqualTo(
 *     NaturalNumber.of(3),
 *     NaturalNumber.of(2)
 *   )
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const greaterThanOrEqualTo: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(0),
   *     NaturalNumber.greaterThanOrEqualTo(NaturalNumber.of(3))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.zero,
   *     NaturalNumber.greaterThanOrEqualTo(NaturalNumber.zero))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *   NaturalNumber.of(4),
   *   NaturalNumber.greaterThanOrEqualTo(NaturalNumber.zero)),
   *   true
   * )
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than or equal to `that`, otherwise `false`.
   */
  (that: NaturalNumber): (self: NaturalNumber) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(Integer.of(-2), NaturalNumber.of(3)),
   *   false
   * )
   *
   * assert(
   *   NaturalNumber.greaterThanOrEqualTo(
   *     NaturalNumber.zero,
   *     NaturalNumber.zero
   *   )
   * )
   *
   * assert(
   *   NaturalNumber.greaterThanOrEqualTo(NaturalNumber.of(4), Integer.zero)
   * )
   * ```
   *
   * @param self - The first `NaturalNumber` to compare.
   * @param that - The second `NaturalNumber` to compare.
   * @returns `true` if `self` is greater than or equal to `that`, otherwise
   *   `false`.
   */
  (self: NaturalNumber, that: NaturalNumber): boolean
} = _Order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `NaturalNumber` is between a minimum and maximum value
 * (inclusive).
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     NaturalNumber.of(3),
 *     NaturalNumber.between({
 *       minimum: NaturalNumber.zero,
 *       maximum: NaturalNumber.of(5)
 *     })
 *   ),
 *   // data-first api
 *   Integer.between(NaturalNumber.of(3), {
 *     minimum: NaturalNumber.zero,
 *     maximum: NaturalNumber.of(5)
 *   })
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @category Predicates
 * @experimental
 */
export const between: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.zero,
   *     Int.between({
   *       minimum: NaturalNumber.one,
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.zero,
   *     Int.between({
   *       minimum: NaturalNumber.zero,
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(3),
   *     NaturalNumber.between({
   *       minimum: NaturalNumber.zero,
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(5),
   *     NaturalNumber.between({
   *       minimum: NaturalNumber.zero,
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(6),
   *     Integer.between({
   *       minimum: Integer.of(-42),
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   false
   * )
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `NaturalNumber`.
   * @param options.maximum - The maximum inclusive `NaturalNumber`.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   between the `minimum` and `maximum` values (inclusive), otherwise
   *   `false`.
   */
  (options: {
    minimum: NaturalNumber
    maximum: NaturalNumber
  }): (self: NaturalNumber) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.between(Integer.of(-1), {
   *     minimum: NaturalNumber.of(0),
   *     maximum: NaturalNumber.of(5)
   *   }),
   *   false
   * )
   *
   * assert.equal(
   *   NaturalNumber.between(Integer.of(0), {
   *     minimum: NaturalNumber.of(0),
   *     maximum: NaturalNumber.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   NaturalNumber.between(NaturalNumber.of(3), {
   *     minimum: NaturalNumber.of(0),
   *     maximum: NaturalNumber.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   NaturalNumber.between(NaturalNumber.of(5), {
   *     minimum: NaturalNumber.of(0),
   *     maximum: NaturalNumber.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   NaturalNumber.between(NaturalNumber.of(6), {
   *     minimum: NaturalNumber.of(0),
   *     maximum: NaturalNumber.of(5)
   *   }),
   *   false
   * )
   * ```
   *
   * @param self - The `NaturalNumber` to check.
   * @param options
   * @param options.minimum - The minimum inclusive `NaturalNumber`.
   * @param options.maximum - The maximum inclusive `NaturalNumber`.
   * @returns `true` if the `Int` is between the `minimum` and `maximum` values
   *   (inclusive), otherwise `false`.
   */
  (
    self: NaturalNumber,
    options: {
      minimum: NaturalNumber
      maximum: NaturalNumber
    }
  ): boolean
} = _Order.between(Order)

/**
 * Restricts the given `NaturalNumber` to be within the range specified by the
 * `minimum` and `maximum` values.
 *
 * - If the `NaturalNumber` is less than the `minimum` value, the function returns
 *   the `minimum` value.
 * - If the `NaturalNumber` is greater than the `maximum` value, the function
 *   returns the `maximum` value.
 * - Otherwise, it returns the original `NaturalNumber`.
 *
 * **Syntax**
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     NaturalNumber.of(3),
 *     NaturalNumber.clamp({
 *       minimum: NaturalNumber.of(0),
 *       maximum: NaturalNumber.of(5)
 *     })
 *   ),
 *   // data-first api
 *   NaturalNumber.clamp(NaturalNumber.of(3), {
 *     minimum: NaturalNumber.of(0),
 *     maximum: NaturalNumber.of(5)
 *   })
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @experimental
 */
export const clamp: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * const clampBetweenOneAndFive: (
   *   n: NaturalNumber.NaturalNumber
   * ) => NaturalNumber.NaturalNumber = NaturalNumber.clamp({
   *   minimum: NaturalNumber.of(1),
   *   maximum: NaturalNumber.of(5)
   * })
   *
   * assert.equal(
   *   pipe(
   *     NaturalNumber.of(3), //
   *     NaturalNumber.clamp({
   *       minimum: NaturalNumber.of(1),
   *       maximum: NaturalNumber.of(5)
   *     })
   *   ),
   *   3
   * )
   *
   * assert.equal(pipe(NaturalNumber.of(0), clampBetweenZeroAndFive), 0)
   *
   * assert.equal(pipe(NaturalNumber.of(6), clampBetweenZeroAndFive), 5)
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `NaturalNumber`.
   * @param options.maximum - The maximum inclusive `NaturalNumber`.
   * @returns A function that takes a `self` and returns the clamped
   *   `NaturalNumber` value.
   */
  (options: {
    minimum: NaturalNumber
    maximum: NaturalNumber
  }): (self: NaturalNumber) => NaturalNumber

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * const options = {
   *   minimum: NaturalNumber.of(1),
   *   maximum: NaturalNumber.of(5)
   * }
   *
   * assert.equal(NaturalNumber.clamp(NaturalNumber.of(3), options), 3)
   *
   * assert.equal(NaturalNumber.clamp(NaturalNumber.of(0), options), 1)
   *
   * assert.equal(NaturalNumber.clamp(NaturalNumber.of(6), options), 5)
   * ```
   *
   * @param self - The `NaturalNumber` to be clamped.
   * @param options
   * @param options.minimum - The minimum inclusive `NaturalNumber`.
   * @param options.maximum - The maximum inclusive `NaturalNumber`.
   * @returns The clamped `NaturalNumber` value.
   */
  (
    self: NaturalNumber,
    options: {
      minimum: NaturalNumber
      maximum: NaturalNumber
    }
  ): NaturalNumber
} = _Order.clamp(Order)

/**
 * Returns the minimum between two `NaturalNumber`s.
 *
 * `NaturalNumber.min` is a `commutative` operation; this means that the order
 * in which the arguments are provided does not affect the result.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * const three = NaturalNumber.of(3)
 * const five = NaturalNumber.of(5)
 *
 * assert.equal(
 *   // data-last api
 *   pipe(three, NaturalNumber.min(five)),
 *   // data-first api
 *   NaturalNumber.min(three, five) // returns three
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @experimental
 */
export const min: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * const three = NaturalNumber.of(3)
   * const two = NaturalNumber.of(2)
   *
   * assert.equal(
   *   pipe(three, NaturalNumber.min(two)), // returns 2
   *   pipe(two, NaturalNumber.min(three)), // returns 2
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param that - The `NaturalNumber` to compare with the `self` when the
   *   resultant function is invoked.
   * @returns A function that takes a `self` and returns the minimum of the two
   *   `NaturalNumber`s (`self` | `that`).
   */
  (that: NaturalNumber): (self: NaturalNumber) => NaturalNumber

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * const three = NaturalNumber.of(3)
   * const five = NaturalNumber.of(5)
   *
   * assert.equal(
   *   NaturalNumber.min(three, five), // returns 3
   *   NaturalNumber.min(five, three), // returns 3
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param self - The first `NaturalNumber` to compare.
   * @param that - The second `NaturalNumber` to compare.
   * @returns The minimum of the two `NaturalNumber`s (`self` | `that`).
   */
  (self: NaturalNumber, that: NaturalNumber): NaturalNumber
} = _Order.min(Order)

/**
 * Returns the maximum between two `NaturalNumber`s.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as NaturalNumber from "effect/NaturalNumber"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(NaturalNumber.of(42), NaturalNumber.max(NaturalNumber.of(0))),
 *   // data-first api
 *   NaturalNumber.max(NaturalNumber.of(42), NaturalNumber.of(0))
 * )
 * ```
 *
 * @memberof NaturalNumber
 * @since 3.14.6
 * @experimental
 */
export const max: {
  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   pipe(NaturalNumber.of(0), NaturalNumber.max(NaturalNumber.of(3))), // returns 3
   *   pipe(NaturalNumber.of(3), NaturalNumber.max(NaturalNumber.of(0))),
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param that - The `NaturalNumber` to compare with the `self` when the
   *   resultant function is invoked.
   * @returns A function that takes a `self` and returns the maximum of the two
   *   `Int`s (`self` | `that`).
   */
  (that: NaturalNumber): (self: NaturalNumber) => NaturalNumber

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as NaturalNumber from "effect/NaturalNumber"
   *
   * assert.equal(
   *   NaturalNumber.max(NaturalNumber.zero, NaturalNumber.of(3)),
   *   NaturalNumber.max(NaturalNumber.of(3), NaturalNumber.zero), // returns 3
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Int` to compare.
   * @param that - The second `Int` to compare.
   * @returns The maximum of the two `Int`s (`self` | `that`).
   */
  (self: NaturalNumber, that: NaturalNumber): NaturalNumber
} = _Order.max(Order)
