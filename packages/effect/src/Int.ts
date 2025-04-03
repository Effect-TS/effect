/** @module Int */

import * as brand from "./Brand.js"
import * as data from "./Data.js"
import type * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as number from "./Number.js"
import type * as option from "./Option.js"
import type * as order from "./Order.js"
import type * as predicate from "./Predicate.js"

/**
 * A type representing singed integers.
 *
 * @memberof Int
 * @category Type
 * @example
 *
 * ```ts
 * import * as Int from "effect/Int"
 *
 * const int: Int.Int = 1
 *
 * // @ts-expect-error - This will fail because 1.5 is not an integer
 * const notInt: Int.Int = 1.5
 * ```
 */
export type Int = number & brand.Brand<"Int">

const Int = brand.refined<Int>(
  (n) => number.isNumber(n) && !Number.isNaN(n) && Number.isInteger(n),
  (n) => brand.error(`Expected ${n} to be an integer`)
)

/**
 * Lift a number in the set of integers, and brands it as an `Int`.
 *
 * @memberof Int
 * @category Constructors
 * @example
 *
 * ```ts
 * import * as Int from "effect/Int"
 * import assert from "node:assert/strict"
 *
 * const aFloat = 1.5
 *
 * assert.throws(() => {
 *   Int.of(aFloat)
 * }, `Expected ${aFloat} to be an integer`)
 * ```
 *
 * @param n - The number to be lifted in the set of Integers .
 * @returns A Int branded type.
 */

export const of: (n: number) => Int = (n) => Int(n)

export const empty: Int = of(0)

export const unit: Int = of(1)

/**
 * Type guard to test if a value is an `Int`.
 *
 * @memberof Int
 * @category Guards
 * @example
 *
 * ```ts
 * import * as Int from "effect/Int"
 * import assert from "node:assert/strict"
 *
 * assert.equal(Int.isInt(1), true)
 *
 * const definitelyAFloat = 1.5
 * let anInt: Int.Int
 * if (Int.isInt(definitelyAFloat)) {
 *   // this is not erroring even if it is absurd because at the type level this is totally fine
 *   // we can assign a float to an `Int` because we have passed through the `Int.isInt` type guard
 *   // by the way, this branch is unreachable at runtime!
 *   anInt = definitelyAFloat
 * }
 *
 * assert.equal(Int.isInt(definitelyAFloat), false)
 * assert.equal(Int.isInt("a"), false)
 * assert.equal(Int.isInt(true), true)
 * ```
 *
 * @param input - The value to test.
 * @returns `true` if the value is an `Int`, `false` otherwise.
 */
export const isInt: predicate.Refinement<unknown, Int> = (input) => number.isNumber(input) && Int.is(input)

/**
 * Provides an addition operation on `Int`.
 *
 * It supports multiple method signatures, allowing for both curried and direct
 * invocation styles with integers and floating-point numbers.
 *
 * @memberof Int
 * @category Math
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
   *     Int.add(Int.empty), // 0
   *     Int.add(1)
   *   ),
   *   1
   * )
   * ```
   */
  (that: Int): (self: Int) => Int

  /**
   * Sum curried function in the set of numbers. It allows you to start from an
   * `Int` and add a number to it.
   *
   * @example
   *
   * ```ts
   * import { pipe, Int, Number } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(10),
   *     Int.add(-10.5), // now the output is no longer an `Int`, but it has been widened to a `number`
   *     Number.add(0)
   *   ),
   *   -0.5
   * )
   * ```
   */
  // (that: number): (self: Int) => number

  /**
   * **data first api**
   *
   * ```ts
   * import { pipe, Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.add(Int.of(10), Int.of(-10)), Int.empty)
   * ```
   */
  (self: Int, that: Int): Int
  /**
   * Sum in the set of Ints and numbers. It allows you to start from an `Int`
   * and add a number to it. The result will be a number.
   *
   * @example
   *
   * ```ts
   * import { pipe, Int, Number } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.add(Int.of(10), -10.5), -0.5)
   * ```
   *
   * @param self - The first term of kind `Int`.
   * @param that - The second term of kind `number`.
   * @returns A `number`
   */
  // (self: Int, that: number): number
} = dual(2, (self: Int, that: Int): Int => of(self + that))

/**
 * Provides a subtraction operation on `Int`s.
 *
 * @memberof Int
 * @category Math
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
   * assert.equal(pipe(Int.of(10), Int.subtract(Int.of(10))), Int.empty)
   * ```
   *
   * @param subtrahend - The integer to subtract from the `minuend` when the
   *   resultant function is invoked.
   * @returns A function that takes a `minuend` and returns the `difference` of
   *   subtracting the `subtrahend` from it.
   */
  (subtrahend: Int): (minuend: Int) => Int

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
   *   Int.empty
   * )
   * ```
   *
   * @param minuend - The integer from which another integer is to be
   *   subtracted.
   * @param subtrahend - The integer to subtract from the minuend.
   * @returns The difference of subtracting the subtrahend from the minuend.
   */
  (minuend: Int, subtrahend: Int): Int
} = dual(2, (minuend: Int, subtrahend: Int): Int => of(minuend - subtrahend))

/**
 * Provides a multiplication operation on `Int`s.
 *
 * @memberof Int
 * @category Math
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
  (multiplicand: Int): (multiplier: Int) => Int

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
  (multiplier: Int, multiplicand: Int): Int
} = dual(
  2,
  (multiplier: Int, multiplicand: Int): Int => of(multiplier * multiplicand)
)

/**
 * Provides a division operation on `Int`s.
 *
 * It returns an `Option` containing the quotient of the division if valid,
 * otherwise `None`.
 *
 * @memberof Int
 * @category Math
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
  (divisor: Int): (dividend: Int) => option.Option<number>

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
  (dividend: Int, divisor: Int): option.Option<number>
} = dual(
  2,
  (dividend: Int, divisor: Int): option.Option<number> => number.divide(dividend, divisor)
)

/**
 * Represents errors that can occur during integer division operations.
 *
 * @memberof Int
 * @category Errors
 */
export class IntegerDivisionError extends data.TaggedError(
  "IntegerDivisionError"
)<{
  readonly dividend: Int
  readonly divisor: Int
  readonly type: "DivisionByZero" | "IndeterminateForm"
  readonly message: string
}> {
  /** @internal */
  static readonly divisionByZero: (dividend: Int) => IntegerDivisionError = (
    dividend
  ) =>
    new IntegerDivisionError({
      dividend,
      divisor: empty,
      type: "DivisionByZero",
      message: `Division by zero: ${dividend} / 0`
    })

  /** @internal */
  static readonly indeterminateForm: () => IntegerDivisionError = () =>
    new IntegerDivisionError({
      dividend: empty,
      divisor: empty,
      type: "IndeterminateForm",
      message: `Indeterminate form: division of zero by zero`
    })
}

/**
 * Performs an unsafe division of two `Int`'s, returning the `quotient` which
 * type is widened to a `number`.
 *
 * As the name suggests, **this operation may throw an
 * {@link module:Int.IntegerDivisionError}** if the `divisor` is zero, resulting
 * in either a division by zero or an indeterminate form.
 *
 * @memberof Int
 * @category Math
 * @throws - An {@link module:Int.IntegerDivisionError} if the divisor is zero.
 */
export const unsafeDivide: {
  /**
   * Divides by the given `divisor`.
   *
   * @example
   *
   * ```ts
   * import { Int, pipe } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(
   *   pipe(
   *     Int.of(6), //
   *     Int.unsafeDivide(Int.of(2))
   *   ),
   *   3
   * )
   *
   * assert.throws(() =>
   *   pipe(
   *     Int.of(6),
   *     Int.unsafeDivide(Int.empty) // throws IntegerDivisionError
   *   )
   * )
   * assert.throws(() =>
   *   pipe(
   *     Int.empty,
   *     Int.unsafeDivide(Int.empty) // throws IntegerDivisionError
   *   )
   * )
   * ```
   *
   * @param divisor - The `Int` by which the `dividend` will be divided.
   * @returns A function that takes a `dividend` and returns the quotient, which
   *   is a `number`. This operation may throw an
   *   {@link module:Int.IntegerDivisionError} if the divisor is zero.
   */
  (divisor: Int): (dividend: Int) => number

  /**
   * Divides the `dividend` by the `divisor`.
   *
   * @example
   *
   * ```ts
   * import { Int } from "effect"
   * import * as assert from "node:assert/strict"
   *
   * assert.equal(Int.unsafeDivide(Int.of(6), Int.of(2)), 3)
   *
   * assert.throws(() => Int.unsafeDivide(Int.of(6), Int.of(0))) // throws IntegerDivisionError
   * assert.throws(() => Int.unsafeDivide(Int.of(0), Int.of(0))) // throws IntegerDivisionError
   * ```
   *
   * @param dividend - The `Int` to be divided.
   * @param divisor - The `Int` by which the dividend is divided.
   * @returns The quotient of the division, which is a `number`.
   * @throws - An {@link module:Int.IntegerDivisionError} if the divisor is zero.
   */
  (dividend: Int, divisor: Int): number
} = dual(2, (dividend: Int, divisor: Int): number => {
  if (divisor === 0) {
    if (dividend === 0) {
      throw IntegerDivisionError.indeterminateForm()
    }
    throw IntegerDivisionError.divisionByZero(dividend)
  }
  return dividend / divisor
})

/**
 * Returns the result of adding one {@link module:Int.unit} to the given `Int`.
 *
 * @memberof Int
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int } from "effect"
 *
 * assert.strictEqual(Int.increment(Int.of(1)), Int.of(2))
 *
 * assert.strictEqual(
 *   pipe(
 *     Int.of(1),
 *     Int.increment,
 *     Int.increment,
 *     Int.increment,
 *     Int.increment
 *   ),
 *   Int.of(5)
 * )
 * ```
 *
 * @param n - The integer value to be incremented.
 * @returns The incremented value by one Int as an `Int`.
 */
export const increment: (n: Int) => Int = (n) => sum(unit)(n)

/**
 * Returns the result of decrementing by one {@link module:Int.unit} to the given
 * `Int`.
 *
 * @memberof Int
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int } from "effect"
 *
 * assert.strictEqual(Int.decrement(Int.of(-100)), Int.of(-101))
 *
 * assert.strictEqual(
 *   pipe(
 *     Int.of(100),
 *     Int.decrement,
 *     Int.decrement,
 *     Int.decrement,
 *     Int.decrement
 *   ),
 *   Int.of(96)
 * )
 * ```
 *
 * @param n - The `Int` to be decremented.
 * @returns The decremented value by one Int as an `Int`.
 */
export const decrement: (n: Int) => Int = (n) => sum(of(-unit))(n)

/**
 * Type class instance of `Equivalence` for `Int`.
 *
 * @memberof Int
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int } from "effect"
 *
 * assert.equal(Int.Equivalence(Int.of(1), Int.of(1)), true)
 * assert.equal(Int.Equivalence(Int.of(1), Int.of(2)), false)
 * ```
 */
export const Equivalence: equivalence.Equivalence<Int> = number.Equivalence
