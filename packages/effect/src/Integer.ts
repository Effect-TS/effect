/**
 * # Integers (ℤ)
 *
 * This module provides operations for working with integers (`ℤ = {..., -3, -2,
 * -1, 0, 1, 2, 3, ...}`).
 *
 * @module Integer
 * @since 3.14.6
 * @experimental
 * @internal
 */

import type * as Brand from "./Brand.js"
import type * as Either from "./Either.js"
import * as _Equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as internal from "./internal/number.js"
import * as _Option from "./Option.js"
import * as _Order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import * as _Predicate from "./Predicate.js"

/**
 * A type representing signed integers.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import * as Integer from "effect/Integer"
 *
 * function onlyInts(int: Integer.Integer): void {
 *   //... stuff for only integers fans
 * }
 *
 * onlyInts(Integer.of(1)) // ok
 *
 * // @ts-expect-error - This will fail because 1.5 is not an integer
 * onlyInts(1.5)
 * ```
 *
 * @experimental
 */
export type Integer = internal.Integer

/**
 * Nominal type representing `NaN` (Not a Number).
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Type
 */
export type NaN = internal.NaN

/**
 * Lift a number in the set of integers, and brands it as an `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as Integer from "effect/Integer"
 * import assert from "node:assert/strict"
 *
 * const aFloat = 1.5
 *
 * assert.throws(() => {
 *   Integer.of(aFloat)
 * }, `Expected ${aFloat} to be an integer`)
 * ```
 *
 * @param n - The number to be lifted in the set of Integers .
 * @returns A Integer branded type.
 * @experimental
 */
export const of: {
  (n: number): Integer
} = (n) => internal.IntegerConstructor(n)

/**
 * Lift a `number` in the set of `Option<Integer>`, and brands it as an
 * `Integer` if the provided number is a valid integer.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Option, pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * // Valid integers return Some<Integer>
 * assert.deepStrictEqual(Integer.option(42), Option.some(Integer.of(42)))
 * assert.deepStrictEqual(Integer.option(0), Option.some(Integer.zero))
 * assert.deepStrictEqual(Integer.option(-7), Option.some(Integer.of(-7)))
 *
 * // Non-integers return None
 * assert.deepStrictEqual(Integer.option(3.14), Option.none())
 * assert.deepStrictEqual(Integer.option(Number.NaN), Option.none())
 *
 * // Safe operations on potentially non-integer values
 * const safelyDouble = (n: number) =>
 *   pipe(
 *     Integer.option(n),
 *     Option.map((int) => Integer.multiply(int, Integer.of(2)))
 *   )
 *
 * assert.deepStrictEqual(safelyDouble(5), Option.some(10))
 * assert.deepStrictEqual(safelyDouble(5.5), Option.none())
 *
 * // Handling both cases with Option.match
 * const processNumber = (n: number) =>
 *   pipe(
 *     Integer.option(n),
 *     Option.match({
 *       onNone: () => "Not an integer",
 *       onSome: (int) => `Integer: ${int}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "Integer: 42")
 * assert.equal(processNumber(4.2), "Not an integer")
 * ```
 *
 * @param n - The `number` to convert to an `Integer`
 * @returns An `Option` containing the `Integer` if valid, `None` otherwise
 * @experimental
 */
export const option: (n: number) => _Option.Option<Integer> = internal.IntegerConstructor.option

/**
 * Lift a `number` in the set of `Either.Right<Integer>` if the number is a
 * valid Integer, `Either.Left<BrandError>` otherwise.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Either, Option, pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * // Valid integers return Right<Integer>
 * assert.deepStrictEqual(Integer.either(42), Either.right(Integer.of(42)))
 * assert.deepStrictEqual(Integer.either(0), Either.right(Integer.zero))
 * assert.deepStrictEqual(Integer.either(-7), Either.right(Integer.of(-7)))
 *
 * // Non-integers return Left<BrandErrors>
 * assert.equal(Either.isLeft(Integer.either(3.14)), true)
 * assert.equal(Either.isLeft(Integer.either(Number.NaN)), true)
 *
 * const Pi = 3.14
 * const floatResult = Integer.either(Pi)
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
 * // Map over valid integers
 * const doubleIfValid = (n: number) =>
 *   pipe(
 *     Integer.either(n),
 *     Either.map((int) => Integer.multiply(int, Integer.of(2)))
 *   )
 *
 * assert.deepStrictEqual(doubleIfValid(5), Either.right(10))
 * assert.equal(Either.isLeft(doubleIfValid(5.5)), true)
 *
 * // Handle both cases with Either.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     Integer.either(n),
 *     Either.match({
 *       onLeft: ([{ message }]) => `Error: ${message}`,
 *       onRight: (int) => `Valid integer: ${int}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "Valid integer: 42")
 * ```
 *
 * @param n - The number to convert to an Integer
 * @returns An `Either` containing the `Integer` if valid, or `BrandErrors` if
 *   invalid
 * @experimental
 */
export const either: (
  n: number
) => Either.Either<Integer, Brand.Brand.BrandErrors> = internal.IntegerConstructor.either

/**
 * Constant of `Integer<0>`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const zero: Integer = internal.zero

/**
 * Constant of `Integer<1>`
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const one: Integer = internal.one

/**
 * Type guard to test if a value is an `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Guards
 * @example
 *
 * ```ts
 * import assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.isInteger(1), true)
 *
 * const definitelyAFloat = 1.5
 * let anInt: Integer.Integer
 * if (Integer.isInteger(definitelyAFloat)) {
 *   // this is not erroring even if it is absurd because at the type level this is totally fine
 *   // we can assign a float to an `Integer` because we have passed through the `Integer.isInteger` type guard
 *   // by the way, this branch is unreachable at runtime!
 *   anInt = definitelyAFloat
 * }
 *
 * assert.equal(Integer.isInteger(definitelyAFloat), false)
 * assert.equal(Integer.isInteger("a"), false)
 * assert.equal(Integer.isInteger(true), false)
 * ```
 *
 * @param input - The value to test.
 * @returns `true` if the value is an `Integer`, `false` otherwise.
 * @experimental
 */
export const isInteger: _Predicate.Refinement<unknown, Integer> = (input) =>
  _Predicate.isNumber(input) && internal.IntegerConstructor.is(input)

/**
 * Provides an addition operation on `Integer`.
 *
 * It supports multiple method signatures, allowing for both curried and direct
 * invocation styles with integers and floating-point numbers.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const sum: {
  /**
   * Sum curried function in the set of integers.
   *
   * **data-last api** a.k.a. pipeable
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(10),
   *     Integer.add(-10),
   *     Integer.add(Integer.zero), // 0
   *     Integer.one
   *   ),
   *   1
   * )
   * ```
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * **data first api**
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.add(Integer.of(10), Integer.of(-10)),
   *   Integer.zero
   * )
   * ```
   */
  (self: Integer, that: Integer): Integer
} = dual(2, (self: Integer, that: Integer): Integer => internal.sum(self, that))

/**
 * Provides a subtraction operation on `Integer`s.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const subtract: {
  /**
   * Returns a function that subtracts a specified `subtrahend` from a given
   * `minuend`.
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(Integer.of(10), Integer.subtract(Integer.of(10))),
   *   Integer.zero
   * )
   * ```
   *
   * @param subtrahend - The integer to subtract from the `minuend` when the
   *   resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it.
   */
  (subtrahend: Integer): (minuend: Integer) => Integer

  /**
   * Subtracts the `subtrahend` from the `minuend` and returns the difference.
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.subtract(Integer.of(10), Integer.of(10)), //
   *   Integer.zero
   * )
   * ```
   *
   * @param minuend - The integer from which another integer is to be
   *   subtracted.
   * @param subtrahend - The integer to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend.
   */
  (minuend: Integer, subtrahend: Integer): Integer
} = dual(2, internal.subtract<Integer>)

/**
 * Provides a multiplication operation on `Integer`s.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const multiply: {
  /**
   * Returns a function that multiplies a specified `multiplier` with a given
   * `multiplicand`.
   *
   * @example
   *
   * ```ts
   * import assert from "node:assert/strict"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(2),
   *     Integer.multiply(Integer.of(3)) //
   *   ),
   *   Integer.of(6)
   * )
   * ```
   *
   * @param multiplicand - The integer to multiply with the `multiplier` when
   *   the resultant function is invoked.
   * @returns A function that takes a `multiplier` and returns the `product` of
   *   multiplying the `multiplier` with the `multiplicand`.
   */
  (multiplicand: Integer): (multiplier: Integer) => Integer

  /**
   * Multiplies two integers and returns the resulting `product`.
   *
   * @example
   *
   * ```ts
   * import assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.multiply(Integer.of(10), Integer.of(-10)), //
   *   Integer.of(-100)
   * )
   * ```
   *
   * @param multiplier - The first integer to multiply.
   * @param multiplicand - The second integer to multiply.
   * @returns The `product` of the multiplier and the multiplicand.
   */
  (multiplier: Integer, multiplicand: Integer): Integer
} = dual(2, internal.multiply<Integer>)

/**
 * Divides one integer by another, mapping from the domain of `Integers` to the
 * codomain of `real numbers` (represented as JavaScript's number type) to
 * accommodate possible fractional results.
 *
 * For the division function `f: ℤ × ℤ → Option<ℝ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0`
 * - `f(a, 0) = None` (division by zero is undefined)
 * - **Domain**: The set of ordered pairs of integers (`ℤ × ℤ`)
 * - **Codomain**: `Option<ℝ>` (an option of real numbers)
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Option, pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.deepStrictEqual(
 *   // data-last api
 *   pipe(Integer.of(-5), Integer.divideToNumber(Integer.of(-2))),
 *   // data-first api
 *   Integer.divideToNumber(Integer.of(-5), Integer.of(-2)) //   Option.some(2.5)
 * )
 * ```
 *
 * @remarks
 * Division is not a closed operation within the set of integers (`ℤ = {..., -2,
 * -1, 0, 1, 2, ...}`). When division doesn't yield a whole number, the result
 * is a fractional number outside ℤ. This function widens to JavaScript's number
 * type (representing ℝ) to accommodate all possible results, and returns an
 * Option to handle the undefined case of division by zero.
 *
 * **Mathematical properties of division on integers**:
 *
 * - **Non-closure in ℤ**: The image of f is not contained within ℤ
 * - **Partiality**: Division by zero is undefined (represented as None)
 * - **Non-commutativity**: `f(a, b) ≠ f(b, a)` (unless `a = b = ±1`)
 * - **Non-associativity**: `f(f(a, b), c) ≠ f(a, f(b, c))` when all are defined
 * - **Right identity** elements: `f(a, ±1) = Some(±a)` for all `a ∈ ℤ`
 * - **No left identity** element: There is no `e ∈ ℤ` such that `f(e, a) =
 *   Some(a)` for all `a ∈ ℤ`
 * - Sign properties:
 *
 *   - `f(a, b) = f(-a, -b)` for all `a, b ∈ ℤ, b ≠ 0`
 *   - `f(-a, b) = f(a, -b) = -f(a, b)` for all `a, b ∈ ℤ, b ≠ 0`
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   pipe(Integer.of(6), Integer.divideToNumber(Integer.of(2))),
   *   Option.some(3)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideToNumber(Integer.of(2))),
   *   Option.some(2.5)
   * )
   *
   * // Division with negative integers
   * assert.deepStrictEqual(
   *   pipe(Integer.of(6), Integer.divideToNumber(Integer.of(-3))),
   *   Option.some(-2)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideToNumber(Integer.zero)),
   *   Option.none()
   * )
   * ```
   *
   * @param divisor - The number by which the dividend will be divided.
   * @returns A function that takes a `dividend` and returns an `Option<number>`
   *   representing the result of the division. Returns `None` if division by
   *   zero is attempted; Otherwise, returns `Some<number>` with the result.
   */
  (divisor: Integer): (dividend: Integer) => _Option.Option<number>

  /**
   * Divides the `dividend` by the `divisor` and returns an `Option` containing
   * the `quotient`, mapping from integers to the real number domain.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // Division resulting in a whole number
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(6), Integer.of(-2)),
   *   Option.some(-3)
   * )
   *
   * // Division mapping to a fractional number
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(5), Integer.of(2)),
   *   Option.some(2.5)
   * )
   *
   * // Division by zero returns None
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.of(5), Integer.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend
   * assert.deepStrictEqual(
   *   Integer.divideToNumber(Integer.zero, Integer.of(5)),
   *   Option.some(0)
   * )
   * ```
   *
   * @param dividend - The Integer to be divided.
   * @param divisor - The Integer by which the dividend is divided.
   * @returns An `Option` containing the quotient of the division if valid,
   *   otherwise `None`.
   */
  (dividend: Integer, divisor: Integer): _Option.Option<number>
} = dual(2, internal.divide<Integer, number>)

/**
 * Implements **division as a partial function on integers** that ensures the
 * closure property, that results remain within the set of integers (`ℤ`), by
 * returning None when the result would fall outside ℤ.
 *
 * For the division function `f: ℤ × ℤ → Option<ℤ>` defined by:
 *
 * - `f(a, b) = Some(a / b)` when `b ≠ 0` and `a` is _exactly divisible_ by `b`
 * - `f(a, b) = None` when `b = 0` or `a` is _not exactly divisible_ by `b`
 * - **Domain**: The set of ordered pairs of integers (`ℤ × ℤ`)
 * - **Codomain**: `Option<ℤ>` (an option of integers)
 *
 * @remarks
 * Unlike {@link module:Integer.divideToNumber}, this operation preserves closure
 * within the integers domain by returning `None` when the result would be
 * fractional or when division is undefined. This creates a partial function
 * that is only defined when the divisor is non-zero and the dividend is exactly
 * divisible by the divisor.
 *
 * **Mathematical properties of safe division on integers**:
 *
 * - **Closure in `ℤ`**: When defined (Some case), the result is always in ℤ
 * - **Partiality**: The function is undefined (None) when divisor = 0 or when
 *   division would yield a fraction
 * - **Non-commutativity**: `f(a, b) ≠ f(b, a)` (unless `a = b = 0` or `a = b =
 *   ±1`)
 * - **Non-associativity**: `f(f(a, b), c) ≠ f(a, f(b, c))` when both sides are
 *   defined
 * - **Right identity elements**: `f(a, ±1) = Some(±a)` for all `a ∈ ℤ`
 * - **Divisibility property**: `f(a, b) = Some(q)` if and only if `a = b × q` for
 *   some `q ∈ ℤ`
 * - **Quotient uniqueness**: If `f(a, b) = Some(q)`, then `q` is the unique
 *   integer such that `a = b × q`
 * - **Sign properties**:
 *
 *   - `f(a, b) = f(-a, -b)` for all `a, b ∈ ℤ`, `b ≠ 0` (same signs yield positive)
 *   - `f(-a, b) = f(a, -b) = -f(a, b)` for all `a, b ∈ ℤ`, `b ≠ 0` (different signs
 *       yield negative)
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divideSafe: {
  /**
   * Returns a function that safely divides a given `dividend` by a specified
   * `divisor`, ensuring the result remains within the integers domain.
   *
   * **Data-last API** (a.k.a. pipeable)
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { pipe, Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(10), Integer.divideSafe(Integer.of(2))),
   *   Option.some(Integer.of(5))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(5), Integer.divideSafe(Integer.of(2))),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   pipe(Integer.of(10), Integer.divideSafe(Integer.zero)),
   *   Option.none()
   * )
   *
   * // With negative numbers (both negative)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(-6), Integer.divideSafe(Integer.of(-2))),
   *   Option.some(Integer.of(3))
   * )
   *
   * // With negative numbers (one negative)
   * assert.deepStrictEqual(
   *   pipe(Integer.of(-6), Integer.divideSafe(Integer.of(3))),
   *   Option.some(Integer.of(-2))
   * )
   *
   * // Can be used in pipelines with Option functions
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(12),
   *     Integer.divideSafe(Integer.of(-4)),
   *     Option.flatMap((n) => Integer.divideSafe(n, Integer.of(3))),
   *     Option.map((n) => Integer.add(n, Integer.of(2)))
   *   ),
   *   Option.some(Integer.of(1)) // 12/(-4) = -3, then -3/3 = -1, then -1+2 = 1
   * )
   * ```
   *
   * @param divisor - The `Integer` to divide the `dividend` by when the
   *   resultant function is invoked.
   * @returns A function that takes a `dividend` and returns an Option
   *   containing the integer quotient if the divisor is non-zero and the
   *   division yields an integer, or None otherwise.
   */
  (divisor: Integer): (dividend: Integer) => _Option.Option<Integer>

  /**
   * Safely divides the `dividend` by the `divisor`, returning an Option that
   * contains the result only if it remains within the integers domain.
   *
   * **Data-first API**
   *
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Option } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * // When dividend is exactly divisible by divisor, returns Some(result)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(6), Integer.of(3)),
   *   Option.some(Integer.of(2))
   * )
   *
   * // When division would result in a fraction, returns None
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(5), Integer.of(2)),
   *   Option.none()
   * )
   *
   * // When dividing by zero, returns None
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(10), Integer.zero),
   *   Option.none()
   * )
   *
   * // Division with zero as dividend and non-zero divisor
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.zero, Integer.of(5)),
   *   Option.some(Integer.zero),
   *   "Zero divided by any non-zero integer equals zero"
   * )
   *
   * // Division when both operands are zero
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.zero, Integer.zero),
   *   Option.none(),
   *   "Division by zero is undefined, even when the dividend is also zero"
   * )
   *
   * // Negative numbers (negative dividend)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(-8), Integer.of(4)),
   *   Option.some(Integer.of(-2)),
   *   "Negative divided by positive gives negative"
   * )
   *
   * // Negative numbers (negative divisor)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(8), Integer.of(-4)),
   *   Option.some(Integer.of(-2)),
   *   "Positive divided by negative gives negative"
   * )
   *
   * // Negative numbers (both negative)
   * assert.deepStrictEqual(
   *   Integer.divideSafe(Integer.of(-8), Integer.of(-4)),
   *   Option.some(Integer.of(2)),
   *   "Negative divided by negative gives positive"
   * )
   * ```
   *
   * @param dividend - The `Integer` to be divided.
   * @param divisor - The `Integer` to divide by.
   * @returns An Option containing the integer quotient if the divisor is
   *   non-zero and the division yields an integer, or None if the divisor is
   *   zero or the division would result in a fraction.
   */
  (dividend: Integer, divisor: Integer): _Option.Option<Integer>
} = dual(2, (dividend: Integer, divisor: Integer) => {
  if (divisor === zero) {
    return _Option.none()
  }
  if (dividend % divisor !== 0) {
    return _Option.none()
  }
  return option(dividend / divisor)
})

/**
 * Returns the result of adding one {@link module:Integer.one} to the given
 * `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.strictEqual(Integer.increment(Integer.of(1)), Integer.of(2))
 *
 * assert.strictEqual(
 *   pipe(
 *     Integer.of(1),
 *     Integer.increment,
 *     Integer.increment,
 *     Integer.increment,
 *     Integer.increment
 *   ),
 *   Integer.of(5)
 * )
 * ```
 *
 * @param n - The integer value to be incremented.
 * @returns The incremented value by one Integer as an `Integer`.
 * @experimental
 */
export const increment: (n: Integer) => Integer = internal.increment

/**
 * Returns the result of decrementing by one {@link module:Integer.one} to the
 * given `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.strictEqual(Integer.decrement(Integer.of(-100)), Integer.of(-101))
 *
 * assert.strictEqual(
 *   pipe(
 *     Integer.of(100),
 *     Integer.decrement,
 *     Integer.decrement,
 *     Integer.decrement,
 *     Integer.decrement
 *   ),
 *   Integer.of(96)
 * )
 * ```
 *
 * @param n - The `Integer` to be decremented.
 * @returns The decremented value by one Integer as an `Integer`.
 * @experimental
 */
export const decrement: (n: Integer) => Integer = internal.decrement

/**
 * Type class instance of `Equivalence` for `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.Equivalence(Integer.of(1), Integer.of(1)), true)
 * assert.equal(Integer.Equivalence(Integer.of(1), Integer.of(2)), false)
 * ```
 *
 * @experimental
 */
export const Equivalence: _Equivalence.Equivalence<Integer> = _Equivalence.number

/**
 * Type class instance of `Order` for `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.Order(Integer.of(-1), Integer.of(2)), -1)
 *
 * assert.equal(Integer.Order(Integer.of(2), Integer.of(2)), 0)
 *
 * assert.equal(Integer.Order(Integer.of(2), Integer.of(-1)), 1)
 * ```
 *
 * @param self - The first `Integer` to compare.
 * @param that - The second `Integer` to compare.
 * @returns -1 if `self` is less than `that`, 0 if they are equal, and 1 if
 * @experimental
 */
export const Order: _Order.Order<Integer> = _Order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise
 * `false`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.deepStrictEqual(
 *   Integer.lessThan(Integer.of(2), Integer.of(3)),
 *   true
 * )
 *
 * assert.deepStrictEqual(
 *   pipe(Integer.of(3), Integer.lessThan(Integer.of(3))),
 *   false
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
   * import * as assert from "node:assert"
   * import { pipe } from "effect"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(2), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   false
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(4), //
   *     Integer.lessThan(Integer.of(3))
   *   ),
   *   false
   * )
   * ```
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(2), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(3), Integer.of(3)),
   *   false
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThan(Integer.of(4), Integer.of(3)),
   *   false
   * )
   * ```
   */
  (self: Integer, that: Integer): boolean
} = _Order.lessThan(Order)

/**
 * Returns a function that checks if a given `Integer` is less than or equal to
 * the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(2),
 *     Integer.lessThanOrEqualTo(Integer.of(3))
 *   ),
 *   // data-first api
 *   Integer.lessThanOrEqualTo(Integer.of(2), Integer.of(3))
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(2))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.lessThanOrEqualTo(Integer.of(4))
   *   ),
   *   false
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   less than or equal to `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(2), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(3), Integer.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Integer.lessThanOrEqualTo(Integer.of(4), Integer.of(3)),
   *   false
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns `true` if `self` is less than or equal to `that`, otherwise
   *   `false`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first `Integer` is greater than the second `Integer`,
 * otherwise `false`.
 *
 * **Syntax**
 *
 * ```ts
 * import { pipe } from "effect"
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(3),
 *     Integer.greaterThan(Integer.of(2))
 *   ),
 *   // data-first api
 *   Integer.greaterThan(Integer.of(3), Integer.of(2))
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(Integer.of(4), Integer.greaterThan(Integer.of(-2))),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(-2), Integer.greaterThan(Integer.of(-2))),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(-2), Integer.greaterThan(Integer.of(3))),
   *   false
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(Integer.greaterThan(Integer.of(4), Integer.of(-2)), true)
   *
   * assert.equal(
   *   Integer.greaterThan(Integer.of(-2), Integer.of(-2)),
   *   false
   * )
   *
   * assert.equal(Integer.greaterThan(Integer.of(-2), Integer.of(3)), false)
   * ```
   *
   * @param self - The first `Integer` value to compare.
   * @param that - The second `Integer` value to compare.
   * @returns A `boolean` indicating whether `self` was greater than `that`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.greaterThan(Order)

/**
 * Returns a function that checks if a given `Integer` is greater than or equal
 * to the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Integer.of(3),
 *     Integer.greaterThanOrEqualTo(Integer.of(2))
 *   ),
 *   // data-first api
 *   Integer.greaterThanOrEqualTo(Integer.of(3), Integer.of(2))
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(-2), //
   *     Integer.greaterThanOrEqualTo(Integer.of(3))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.zero, //
   *     Integer.greaterThanOrEqualTo(Integer.of(-Integer.zero))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(Integer.of(4), Integer.greaterThanOrEqualTo(Integer.of(-2))),
   *   true
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than or equal to `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(Integer.of(-2), Integer.of(3)),
   *   false
   * )
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(
   *     Integer.zero,
   *     Integer.of(-Integer.zero)
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.greaterThanOrEqualTo(Integer.of(4), Integer.of(-2)),
   *   true
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns `true` if `self` is greater than or equal to `that`, otherwise
   *   `false`.
   */
  (self: Integer, that: Integer): boolean
} = _Order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `Integer` is between a minimum and maximum value (inclusive).
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     Integer.of(3),
 *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
 *   ),
 *   // data-first api
 *   Integer.between(Integer.of(3), {
 *     minimum: Integer.of(0),
 *     maximum: Integer.of(5)
 *   })
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(-1),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(0),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(3),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(5),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(6),
   *     Integer.between({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   false
   * )
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   between the `minimum` and `maximum` values (inclusive), otherwise
   *   `false`.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.between(Integer.of(-1), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   false
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(0), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(3), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(5), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   true
   * )
   *
   * assert.equal(
   *   Integer.between(Integer.of(6), {
   *     minimum: Integer.of(0),
   *     maximum: Integer.of(5)
   *   }),
   *   false
   * )
   * ```
   *
   * @param self - The `Integer` to check.
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns `true` if the `Integer` is between the `minimum` and `maximum`
   *   values (inclusive), otherwise `false`.
   */
  (
    self: Integer,
    options: {
      minimum: Integer
      maximum: Integer
    }
  ): boolean
} = _Order.between(Order)

/**
 * Restricts the given `Integer` to be within the range specified by the
 * `minimum` and `maximum` values.
 *
 * - If the `Integer` is less than the `minimum` value, the function returns the
 *   `minimum` value.
 * - If the `Integer` is greater than the `maximum` value, the function returns
 *   the `maximum` value.
 * - Otherwise, it returns the original `Integer`.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     Integer.of(3),
 *     Integer.clamp({ minimum: Integer.of(0), maximum: Integer.of(5) })
 *   ),
 *   // data-first api
 *   Integer.clamp(Integer.of(3), {
 *     minimum: Integer.of(0),
 *     maximum: Integer.of(5)
 *   })
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * const clampBetweenZeroAndFive: (
   *   n: Integer.Integer
   * ) => Integer.Integer = Integer.clamp({
   *   minimum: Integer.of(0),
   *   maximum: Integer.of(5)
   * })
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(3), //
   *     Integer.clamp({ minimum: Integer.of(0), maximum: Integer.of(5) })
   *   ),
   *   3
   * )
   *
   * assert.equal(pipe(Integer.of(-1), clampBetweenZeroAndFive), 0)
   *
   * assert.equal(pipe(Integer.of(6), clampBetweenZeroAndFive), 5)
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns A function that takes a `self` and returns the clamped `Integer`
   *   value.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * const options = { minimum: Integer.of(1), maximum: Integer.of(5) }
   *
   * assert.equal(Integer.clamp(Integer.of(3), options), 3)
   *
   * assert.equal(Integer.clamp(Integer.of(0), options), 1)
   *
   * assert.equal(Integer.clamp(Integer.of(6), options), 5)
   * ```
   *
   * @param self - The `Integer` to be clamped.
   * @param options
   * @param options.minimum - The minimum inclusive `Integer`.
   * @param options.maximum - The maximum inclusive `Integer`.
   * @returns The clamped `Integer` value.
   */
  (
    self: Integer,
    options: {
      minimum: Integer
      maximum: Integer
    }
  ): Integer
} = _Order.clamp(Order)

/**
 * Returns the minimum between two `Integer`s.
 *
 * `Integer.min` is a `commutative` operation; this means that the order in
 * which the arguments are provided does not affect the result.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const three = Integer.of(3)
 * const five = Integer.of(5)
 *
 * assert.equal(
 *   // data-last api
 *   pipe(three, Integer.min(five)),
 *   // data-first api
 *   Integer.min(three, five) // returns three
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * const three = Integer.of(3)
   * const two = Integer.of(2)
   *
   * assert.equal(
   *   pipe(three, Integer.min(two)), // returns 2
   *   pipe(two, Integer.min(three)), // returns 2
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the minimum of the two
   *   `Integer`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as Integer from "effect/Integer"
   * import * as assert from "node:assert/strict"
   *
   * const three = Integer.of(3)
   * const five = Integer.of(5)
   *
   * assert.equal(
   *   Integer.min(three, five), // returns 3
   *   Integer.min(five, three), // returns 3
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns The minimum of the two `Integer`s (`self` | `that`).
   */
  (self: Integer, that: Integer): Integer
} = _Order.min(Order)

/**
 * Returns the maximum between two `Integer`s.
 *
 * **Syntax**
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { pipe } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * const negativeTwo = Integer.of(-2)
 * const three = Integer.of(3)
 *
 * assert.equal(
 *   // data-last api
 *   Integer.max(negativeTwo, three), // returns 3
 *   // data-first api
 *   pipe(negativeTwo, Integer.max(three)) // returns 3
 * )
 * ```
 *
 * @memberof Integer
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
   * import * as Integer from "effect/Integer"
   *
   * const negativeTwo = Integer.of(-2)
   * const three = Integer.of(3)
   *
   * assert.equal(
   *   pipe(
   *     negativeTwo,
   *     Integer.max(three) // returns 3
   *   ),
   *   pipe(
   *     three,
   *     Integer.max(negativeTwo) // returns 3
   *   ),
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param that - The `Integer` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the maximum of the two
   *   `Integer`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import * as Integer from "effect/Integer"
   *
   * assert.equal(
   *   Integer.max(Integer.of(-2), Integer.of(3)), // returns 3
   *   Integer.max(Integer.of(3), Integer.of(-2)), // returns 3
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Integer` to compare.
   * @param that - The second `Integer` to compare.
   * @returns The maximum of the two `Integer`s (`self` | `that`).
   */
  (self: Integer, that: Integer): Integer
} = _Order.max(Order)

/**
 * Determines the sign of a given `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(Integer.sign(Integer.of(-10)), -1)
 * assert.equal(Integer.sign(Integer.of(0)), 0)
 * assert.equal(Integer.sign(Integer.of(10)), 1)
 * ```
 *
 * @param n - The `Integer` to determine the sign of.
 * @returns -1 if `n` is negative, 0 if `n` is zero, and 1 if `n` is positive.
 * @experimental
 */
export const sign: (n: Integer) => Ordering = (n) => Order(n, zero)

/**
 * Takes an `Iterable` of `Integer`s and returns their sum as a single
 * `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { HashSet } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   Integer.sumAll(
 *     HashSet.make(Integer.of(-2), Integer.of(-3), Integer.of(4))
 *   ), //
 *   Integer.of(-1)
 * )
 * ```
 *
 * @param collection - An `Iterable<Integer>` to reduce to a sum.
 * @returns The sum of the `Integer`s in the `Iterable`.
 * @experimental
 */
export const sumAll: {
  (collection: Iterable<Integer>): Integer
} = internal.sumAll<Integer>

/**
 * Takes an `Iterable` of `Integer`s and returns their multiplication as a
 * single `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { HashSet } from "effect"
 * import * as Integer from "effect/Integer"
 *
 * assert.equal(
 *   Integer.multiplyAll(
 *     HashSet.make(Integer.of(-2), Integer.of(-3), Integer.of(4))
 *   ), //
 *   Integer.of(24)
 * )
 * ```
 *
 * @param collection - An `Iterable<Integer>` to reduce to a product.
 * @returns The product of the `Integer`s in the `Iterable`.
 * @experimental
 */
export const multiplyAll: {
  (collection: Iterable<Integer>): Integer
} = internal.multiplyAll<Integer>

/**
 * Returns the remainder left over when one operand is divided by a second
 * operand.
 *
 * It always takes the sign of the dividend.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 * @todo Provide an implementation and tests
 */
export const remainder: {
  (divisor: Integer): (dividend: Integer) => Integer
  (dividend: Integer, divisor: Integer): Integer
} = dual(
  2,
  (dividend: Integer, divisor: Integer): Integer => of(dividend % divisor)
)

/**
 * Returns the next power of 2 greater than or equal to the given `Integer`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import * as Integer from "effect/Integer"
 *
 * assert.deepStrictEqual(Integer.nextPow2(Integer.of(5)), 8)
 * assert.deepStrictEqual(Integer.nextPow2(Integer.of(17)), 32)
 * assert.deepStrictEqual(Integer.nextPow2(Integer.of(0)), 2)
 * assert.deepStrictEqual(
 *   Number.isNaN(Integer.nextPow2(Integer.of(-1))),
 *   true
 * ) // Negative inputs result in NaN
 * ```
 *
 * @experimental
 */
export const nextPow2: {
  (n: Integer): Integer | internal.NaN
} = (n) => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2) as Integer | internal.NaN
}
