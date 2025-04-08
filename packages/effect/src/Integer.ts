/**
 * # Integers (ℤ)
 *
 * This module provides operations for working with integers (ℤ = {..., -3, -2,
 * -1, 0, 1, 2, 3, ...}).
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
import * as _Number from "./Number.js"
import type * as _Option from "./Option.js"
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
 * import { Integer } from "effect"
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
 * import { Integer, Option, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
 * import { Either, Integer, Option, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
 * import * as Integer from "effect/Integer"
 * import assert from "node:assert/strict"
 *
 * assert.equal(Integer.isInt(1), true)
 *
 * const definitelyAFloat = 1.5
 * let anInt: Integer.Integer
 * if (Integer.isInt(definitelyAFloat)) {
 *   // this is not erroring even if it is absurd because at the type level this is totally fine
 *   // we can assign a float to an `Integer` because we have passed through the `Integer.isInt` type guard
 *   // by the way, this branch is unreachable at runtime!
 *   anInt = definitelyAFloat
 * }
 *
 * assert.equal(Integer.isInt(definitelyAFloat), false)
 * assert.equal(Integer.isInt("a"), false)
 * assert.equal(Integer.isInt(true), false)
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
   * import { pipe, Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(10),
   *     Int.add(-10),
   *     Int.add(Int.zero), // 0
   *     Int.add(1)
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
   * import { pipe, Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.add(Int.of(10), Int.of(-10)), Int.zero)
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
   * import { pipe, Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(pipe(Int.of(10), Int.subtract(Int.of(10))), Int.zero)
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
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   Int.subtract(Int.of(10), Int.of(10)), //
   *   Int.zero
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
   * import { pipe, Int } from "effect"
   * import assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(2),
   *     Int.multiply(Int.of(3)) //
   *   ),
   *   6
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
   * import { Int } from "effect"
   * import assert from "node:assert/strict"
   *
   * assert.equal(
   *   Int.multiply(Int.of(10), Int.of(-10)), //
   *   -100
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
 * Provides a division operation on `Integer`s.
 *
 * It returns an `Option` containing the quotient of the division if valid,
 * otherwise `None`.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @experimental
 */
export const divide: {
  /**
   * @example
   *
   * ```ts
   * import { Int, Option, pipe } from "effect"
   * import assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(6), //
   *     Int.divide(Int.of(2))
   *   ),
   *   Option.some(3)
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
   * the `quotient`. If the `divisor` is zero, returns `None` to signify an
   * invalid operation.
   *
   * @example
   *
   * ```ts
   * import { Int, Option } from "effect"
   * import assert from "node:assert/strict"
   *
   * assert.deepStrictEqual(
   *   Int.divide(Int.of(6), Int.of(2)),
   *   Option.some(3)
   * )
   * ```
   *
   * @param dividend - The Int to be divided.
   * @param divisor - The Int by which the dividend is divided.
   * @returns An `Option` containing the quotient of the division if valid,
   *   otherwise `None`.
   */
  (dividend: Integer, divisor: Integer): _Option.Option<number>
} = dual(2, internal.divide<Integer, number>)

/**
 * /** Performs an unsafe division of two `Integer`'s, returning the `quotient`
 * which type is widened to a `number`.
 *
 * As the name suggests, **this operation may throw an
 * {@link module:Number.DivisionByZeroError}** if the `divisor` is zero,
 * resulting in either a division by zero or an indeterminate form.
 *
 * @memberof Integer
 * @since 3.14.6
 * @category Math
 * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is zero.
 * @experimental
 */
export const unsafeDivide: {
  /**
   * Divides by the given `divisor`.
   *
   * @example
   *
   * ```ts
   * import { Integer, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Integer.of(6), //
   *     Integer.unsafeDivide(Integer.of(2))
   *   ),
   *   3
   * )
   *
   * assert.throws(() =>
   *   pipe(
   *     Integer.of(6),
   *     Integer.unsafeDivide(Integer.zero) // throws IntegerDivisionError
   *   )
   * )
   * assert.throws(() =>
   *   pipe(
   *     Integer.zero,
   *     Integer.unsafeDivide(Integer.zero) // throws IntegerDivisionError
   *   )
   * )
   * ```
   *
   * @param divisor - The `Integer` by which the `dividend` will be divided.
   * @returns A function that takes a `dividend` and returns the quotient, which
   *   is a `number`. This operation may throw an
   *   {@link module:Number.DivisionByZeroError} if the divisor is zero.
   */
  (divisor: Integer): (dividend: Integer) => number

  /**
   * Divides the `dividend` by the `divisor`.
   *
   * @example
   *
   * ```ts
   * import { Integer } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Integer.unsafeDivide(Integer.of(6), Integer.of(2)), 3)
   *
   * assert.throws(() => Integer.unsafeDivide(Integer.of(6), Integer.of(0))) // throws IntegerDivisionError
   * assert.throws(() => Integer.unsafeDivide(Integer.of(0), Integer.of(0))) // throws IntegerDivisionError
   * ```
   *
   * @param dividend - The `Integer` to be divided.
   * @param divisor - The `Integer` by which the dividend is divided.
   * @returns The quotient of the division, which is a `number`.
   * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is
   *   zero.
   */
  (dividend: Integer, divisor: Integer): number
} = dual(2, internal.unsafeDivide<Integer, number>)

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
 * import { Integer, pipe } from "effect"
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
 * import { Integer, pipe } from "effect"
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
 * import { Integer } from "effect"
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
 * import { Integer } from "effect"
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
 * import { Integer, pipe } from "effect"
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
   * import { Int, pipe } from "effect"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(2), //
   *     Int.lessThan(Int.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(3), //
   *     Int.lessThan(Int.of(3))
   *   ),
   *   false
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(4), //
   *     Int.lessThan(Int.of(3))
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
   * import { Int } from "effect"
   *
   * assert.deepStrictEqual(Int.lessThan(Int.of(2), Int.of(3)), true)
   *
   * assert.deepStrictEqual(Int.lessThan(Int.of(3), Int.of(3)), false)
   *
   * assert.deepStrictEqual(Int.lessThan(Int.of(4), Int.of(3)), false)
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(3), //
   *     Int.lessThanOrEqualTo(Int.of(2))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(3), //
   *     Int.lessThanOrEqualTo(Int.of(3))
   *   ),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Int.of(3), //
   *     Int.lessThanOrEqualTo(Int.of(4))
   *   ),
   *   false
   * )
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
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
   * import { Int } from "effect"
   *
   * assert.deepStrictEqual(
   *   Int.lessThanOrEqualTo(Int.of(2), Int.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Int.lessThanOrEqualTo(Int.of(3), Int.of(3)),
   *   true
   * )
   *
   * assert.deepStrictEqual(
   *   Int.lessThanOrEqualTo(Int.of(4), Int.of(3)),
   *   false
   * )
   * ```
   *
   * @param self - The first `Int` to compare.
   * @param that - The second `Int` to compare.
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   *
   * assert.equal(pipe(Int.of(4), Int.greaterThan(Int.of(-2))), true)
   *
   * assert.equal(pipe(Int.of(-2), Int.greaterThan(Int.of(-2))), false)
   *
   * assert.equal(pipe(Int.of(-2), Int.greaterThan(Int.of(3))), false)
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.greaterThan(Int.of(4), Int.of(-2)), true)
   *
   * assert.equal(Int.greaterThan(Int.of(-2), Int.of(-2)), false)
   *
   * assert.equal(Int.greaterThan(Int.of(-2), Int.of(3)), false)
   * ```
   *
   * @param self - The first `Int` value to compare.
   * @param that - The second `Int` value to compare.
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(-2), //
   *     Int.greaterThanOrEqualTo(Int.of(3))
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Int.zero, //
   *     Int.greaterThanOrEqualTo(Int.of(-Int.zero))
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(Int.of(4), Int.greaterThanOrEqualTo(Int.of(-2))),
   *   true
   * )
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   greater than or equal to `that`, otherwise `false`.
   */
  (that: Integer): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.greaterThanOrEqualTo(Int.of(-2), Int.of(3)), false)
   *
   * assert.equal(
   *   Int.greaterThanOrEqualTo(Int.zero, Int.of(-Int.zero)),
   *   true
   * )
   *
   * assert.equal(Int.greaterThanOrEqualTo(Int.of(4), Int.of(-2)), true)
   * ```
   *
   * @param self - The first `Int` to compare.
   * @param that - The second `Int` to compare.
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(-1),
   *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   false
   * )
   *
   * assert.equal(
   *   pipe(
   *     Int.of(0),
   *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Int.of(3),
   *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Int.of(5),
   *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   true
   * )
   *
   * assert.equal(
   *   pipe(
   *     Int.of(6),
   *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   false
   * )
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Int`.
   * @param options.maximum - The maximum inclusive `Int`.
   * @returns A function that takes a `self` and returns `true` if `self` is
   *   between the `minimum` and `maximum` values (inclusive), otherwise
   *   `false`.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => boolean

  /**
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   Int.between(Int.of(-1), { minimum: Int.of(0), maximum: Int.of(5) }),
   *   false
   * )
   *
   * assert.equal(
   *   Int.between(Int.of(0), { minimum: Int.of(0), maximum: Int.of(5) }),
   *   true
   * )
   *
   * assert.equal(
   *   Int.between(Int.of(3), { minimum: Int.of(0), maximum: Int.of(5) }),
   *   true
   * )
   *
   * assert.equal(
   *   Int.between(Int.of(5), { minimum: Int.of(0), maximum: Int.of(5) }),
   *   true
   * )
   *
   * assert.equal(
   *   Int.between(Int.of(6), { minimum: Int.of(0), maximum: Int.of(5) }),
   *   false
   * )
   * ```
   *
   * @param self - The `Int` to check.
   * @param options
   * @param options.minimum - The minimum inclusive `Int`.
   * @param options.maximum - The maximum inclusive `Int`.
   * @returns `true` if the `Int` is between the `minimum` and `maximum` values
   *   (inclusive), otherwise `false`.
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const clampBetweenZeroAndFive: (n: Int.Int) => Int.Int = Int.clamp({
   *   minimum: Int.of(0),
   *   maximum: Int.of(5)
   * })
   *
   * assert.equal(
   *   pipe(
   *     Int.of(3), //
   *     Int.clamp({ minimum: Int.of(0), maximum: Int.of(5) })
   *   ),
   *   3
   * )
   *
   * assert.equal(pipe(Int.of(-1), clampBetweenZeroAndFive), 0)
   *
   * assert.equal(pipe(Int.of(6), clampBetweenZeroAndFive), 5)
   * ```
   *
   * @param options
   * @param options.minimum - The minimum inclusive `Int`.
   * @param options.maximum - The maximum inclusive `Int`.
   * @returns A function that takes a `self` and returns the clamped `Int`
   *   value.
   */
  (options: { minimum: Integer; maximum: Integer }): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import * as assert from "node:assert/strict"
   * import { Int } from "effect"
   *
   * const options = { minimum: Int.of(1), maximum: Int.of(5) }
   *
   * assert.equal(Int.clamp(Int.of(3), options), 3)
   *
   * assert.equal(Int.clamp(Int.of(0), options), 1)
   *
   * assert.equal(Int.clamp(Int.of(6), options), 5)
   * ```
   *
   * @param self - The `Int` to be clamped.
   * @param options
   * @param options.minimum - The minimum inclusive `Int`.
   * @param options.maximum - The maximum inclusive `Int`.
   * @returns The clamped `Int` value.
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
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const three = Int.of(3)
   * const two = Int.of(2)
   *
   * assert.equal(
   *   pipe(three, Int.min(two)), // returns 2
   *   pipe(two, Int.min(three)), // returns 2
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the minimum of the two
   *   `Int`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const three = Int.of(3)
   * const five = Int.of(5)
   *
   * assert.equal(
   *   Int.min(three, five), // returns 3
   *   Int.min(five, three), // returns 3
   *   "the min operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Int` to compare.
   * @param that - The second `Int` to compare.
   * @returns The minimum of the two `Int`s (`self` | `that`).
   */
  (self: Integer, that: Integer): Integer
} = _Order.min(Order)

/**
 * Returns the maximum between two `Integer`s.
 *
 * **Syntax**
 *
 * ```ts
 * import { Integer, pipe } from "effect"
 * import * as assert from "node:assert/strict"
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
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * const negativeTwo = Int.of(-2)
   * const three = Int.of(3)
   *
   * assert.equal(
   *   pipe(
   *     negativeTwo,
   *     Int.max(three) // returns 3
   *   ),
   *   pipe(
   *     three,
   *     Int.max(negativeTwo) // returns 3
   *   ),
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param that - The `Int` to compare with the `self` when the resultant
   *   function is invoked.
   * @returns A function that takes a `self` and returns the maximum of the two
   *   `Int`s (`self` | `that`).
   */
  (that: Integer): (self: Integer) => Integer

  /**
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   Int.max(Int.of(-2), Int.of(3)), // returns 3
   *   Int.max(Int.of(3), Int.of(-2)), // returns 3
   *   "the max operation is commutative"
   * )
   * ```
   *
   * @param self - The first `Int` to compare.
   * @param that - The second `Int` to compare.
   * @returns The maximum of the two `Int`s (`self` | `that`).
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
 * import { Integer } from "effect"
 * import * as assert from "node:assert/strict"
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
 * import { Integer, HashSet } from "effect"
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
 * import { Integer, HashSet } from "effect"
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
 * import { Integer } from "effect"
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
