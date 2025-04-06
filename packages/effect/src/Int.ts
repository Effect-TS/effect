/**
 * @module Int
 * @since 3.14.6
 * @experimental
 * @internal
 */
import * as Brand from "./Brand.js"
import * as Data from "./Data.js"
import type * as Either from "./Either.js"
import type * as _Equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as internal from "./internal/number.js"
import * as _Iterable from "./Iterable.js"
import * as _Number from "./Number.js"
import type * as _Option from "./Option.js"
import * as _Order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import type * as _Predicate from "./Predicate.js"

const IntConstructor = Brand.refined<number & Brand.Brand<"Int">>(
  (n) => _Number.isNumber(n) && !Number.isNaN(n) && Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

/**
 * A type representing signed integers.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Type
 * @example
 *
 * ```ts
 * import { Int } from "effect"
 *
 * function onlyInts(int: Int.Int): void {
 *   //... stuff for only integers fans
 * }
 *
 * onlyInts(Int.of(1)) // ok
 *
 * // @ts-expect-error - This will fail because 1.5 is not an integer
 * onlyInts(1.5)
 * ```
 *
 * @experimental
 */
export type Int = Brand.Brand.FromConstructor<typeof IntConstructor>

/**
 * Lift a number in the set of integers, and brands it as an `Int`.
 *
 * @memberof Int
 * @since 3.14.6
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
 * @experimental
 */

export const of: (n: number) => Int = (n) => IntConstructor(n)

/**
 * Lift a `number` in the set of `Option<Int>`, and brands it as an `Int` if the
 * provided number is a valid integer.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Int, Option, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * // Valid integers return Some<Int>
 * assert.deepStrictEqual(Int.option(42), Option.some(Int.of(42)))
 * assert.deepStrictEqual(Int.option(0), Option.some(Int.empty))
 * assert.deepStrictEqual(Int.option(-7), Option.some(Int.of(-7)))
 *
 * // Non-integers return None
 * assert.deepStrictEqual(Int.option(3.14), Option.none())
 * assert.deepStrictEqual(Int.option(Number.NaN), Option.none())
 *
 * // Safe operations on potentially non-integer values
 * const safelyDouble = (n: number) =>
 *   pipe(
 *     Int.option(n),
 *     Option.map((int) => Int.multiply(int, Int.of(2)))
 *   )
 *
 * assert.deepStrictEqual(safelyDouble(5), Option.some(10))
 * assert.deepStrictEqual(safelyDouble(5.5), Option.none())
 *
 * // Handling both cases with Option.match
 * const processNumber = (n: number) =>
 *   pipe(
 *     Int.option(n),
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
 * @param n - The `number` to convert to an `Int`
 * @returns An `Option` containing the `Int` if valid, `None` otherwise
 * @experimental
 */
export const option: (n: number) => _Option.Option<Int> = IntConstructor.option

/**
 * Lift a `number` in the set of `Either.Right<Int>` if the number is a valid
 * Int, `Either.Left<BrandError>` otherwise.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Constructors
 * @example
 *
 * ```ts
 * import { Either, Int, Option, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * // Valid integers return Right<Int>
 * assert.deepStrictEqual(Int.either(42), Either.right(Int.of(42)))
 * assert.deepStrictEqual(Int.either(0), Either.right(Int.empty))
 * assert.deepStrictEqual(Int.either(-7), Either.right(Int.of(-7)))
 *
 * // Non-integers return Left<BrandErrors>
 * assert.equal(Either.isLeft(Int.either(3.14)), true)
 * assert.equal(Either.isLeft(Int.either(Number.NaN)), true)
 *
 * const Pi = 3.14
 * const floatResult = Int.either(Pi)
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
 *     Int.either(n),
 *     Either.map((int) => Int.multiply(int, Int.of(2)))
 *   )
 *
 * assert.deepStrictEqual(doubleIfValid(5), Either.right(10))
 * assert.equal(Either.isLeft(doubleIfValid(5.5)), true)
 *
 * // Handle both cases with Either.match
 * const processNumber = (n: number): string =>
 *   pipe(
 *     Int.either(n),
 *     Either.match({
 *       onLeft: ([{ message }]) => `Error: ${message}`,
 *       onRight: (int) => `Valid integer: ${int}`
 *     })
 *   )
 *
 * assert.equal(processNumber(42), "Valid integer: 42")
 * ```
 *
 * @param n - The number to convert to an Int
 * @returns An `Either` containing the `Int` if valid, or `BrandErrors` if
 *   invalid
 * @experimental
 */
export const either: (
  n: number
) => Either.Either<Int, Brand.Brand.BrandErrors> = IntConstructor.either

/**
 * Constant of `Int<0>`
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const zero: Int = of(0)

/**
 * Constant of `Int<1>`
 *
 * @since 3.14.6
 * @category Constants
 * @experimental
 */
export const one: Int = of(1)

/**
 * Type guard to test if a value is an `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Guards
 * @example
 *
 * ```ts
 * import { Int } from "effect"
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
 * assert.equal(Int.isInt(true), false)
 * ```
 *
 * @param input - The value to test.
 * @returns `true` if the value is an `Int`, `false` otherwise.
 * @experimental
 */
export const isInt: _Predicate.Refinement<unknown, Int> = (input) => _Number.isNumber(input) && IntConstructor.is(input)

/**
 * Provides an addition operation on `Int`.
 *
 * It supports multiple method signatures, allowing for both curried and direct
 * invocation styles with integers and floating-point numbers.
 *
 * @memberof Int
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
} = dual(2, (self: Int, that: Int): Int => internal.sum(self, that))

/**
 * Provides a subtraction operation on `Int`s.
 *
 * @memberof Int
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
} = dual(2, (minuend: Int, subtrahend: Int): Int => internal.subtract(minuend, subtrahend))

/**
 * Provides a multiplication operation on `Int`s.
 *
 * @memberof Int
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
  (multiplier: Int, multiplicand: Int): Int => internal.multiply(multiplier, multiplicand)
)

/**
 * Provides a division operation on `Int`s.
 *
 * It returns an `Option` containing the quotient of the division if valid,
 * otherwise `None`.
 *
 * @memberof Int
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
  (divisor: Int): (dividend: Int) => _Option.Option<number>

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
  (dividend: Int, divisor: Int): _Option.Option<number>
} = dual(
  2,
  (dividend: Int, divisor: Int): _Option.Option<number> => _Number.divide(dividend, divisor)
)

/**
 * Represents errors that can occur during integer division operations.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Errors
 * @experimental
 */
export class DivisionByZeroError<A extends number = number> extends Data.TaggedError(
  "IntegerDivisionError"
)<{
  readonly dividend: A
  readonly divisor: Int
  readonly type: "DivisionByZero" | "IndeterminateForm"
  readonly message: string
}> {
  /** @internal */
  static readonly divisionByZero: <A extends number = number>(dividend: A) => DivisionByZeroError = (
    dividend
  ) =>
    new DivisionByZeroError({
      dividend,
      divisor: zero,
      type: "DivisionByZero",
      message: `Division by zero: ${dividend} / 0`
    })

  /** @internal */
  static readonly indeterminateForm: () => DivisionByZeroError = () =>
    new DivisionByZeroError({
      dividend: zero,
      divisor: zero,
      type: "IndeterminateForm",
      message: `Indeterminate form: division of zero by zero`
    })
}

/**
 * Performs an unsafe division of two `Int`'s, returning the `quotient` which
 * type is widened to a `number`.
 *
 * As the name suggests, **this operation may throw an
 * {@link module:Int.DivisionByZeroError}** if the `divisor` is zero, resulting
 * in either a division by zero or an indeterminate form.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @throws - An {@link module:Int.DivisionByZeroError} if the divisor is zero.
 * @experimental
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
   *   {@link module:Int.DivisionByZeroError} if the divisor is zero.
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
   * @throws - An {@link module:Int.DivisionByZeroError} if the divisor is zero.
   */
  (dividend: Int, divisor: Int): number
} = dual(2, (dividend: Int, divisor: Int): number => {
  if (divisor === 0) {
    if (dividend === 0) {
      throw DivisionByZeroError.indeterminateForm()
    }
    throw DivisionByZeroError.divisionByZero(dividend)
  }
  return dividend / divisor
})

/**
 * Returns the result of adding one {@link module:Int.one} to the given `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int, pipe } from "effect"
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
 * @experimental
 */
export const increment: (n: Int) => Int = (n) => sum(one)(n)

/**
 * Returns the result of decrementing by one {@link module:Int.one} to the given
 * `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int, pipe } from "effect"
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
 * @experimental
 */
export const decrement: (n: Int) => Int = (n) => sum(of(-one))(n)

/**
 * Type class instance of `Equivalence` for `Int`.
 *
 * @memberof Int
 * @since 3.14.6
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
 *
 * @experimental
 */
export const Equivalence: _Equivalence.Equivalence<Int> = _Number.Equivalence

/**
 * Type class instance of `Order` for `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Instances
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int } from "effect"
 *
 * assert.equal(Int.Order(Int.of(-1), Int.of(2)), -1)
 *
 * assert.equal(Int.Order(Int.of(2), Int.of(2)), 0)
 *
 * assert.equal(Int.Order(Int.of(2), Int.of(-1)), 1)
 * ```
 *
 * @param self - The first `Int` to compare.
 * @param that - The second `Int` to compare.
 * @returns -1 if `self` is less than `that`, 0 if they are equal, and 1 if
 * @experimental
 */
export const Order: _Order.Order<Int> = _Number.Order

/**
 * Returns `true` if the first argument is less than the second, otherwise
 * `false`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Predicates
 * @example
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { Int, pipe } from "effect"
 *
 * assert.deepStrictEqual(Int.lessThan(Int.of(2), Int.of(3)), true)
 *
 * assert.deepStrictEqual(pipe(Int.of(3), Int.lessThan(Int.of(3))), false)
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
  (that: Int): (self: Int) => boolean

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
  (self: Int, that: Int): boolean
} = _Order.lessThan(Order)

/**
 * Returns a function that checks if a given `Int` is less than or equal to the
 * provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Int.of(2),
 *     Int.lessThanOrEqualTo(Int.of(3))
 *   ),
 *   // data-first api
 *   Int.lessThanOrEqualTo(Int.of(2), Int.of(3))
 * )
 * ```
 *
 * @memberof Int
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
  (that: Int): (self: Int) => boolean

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
  (self: Int, that: Int): boolean
} = _Order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first `Int` is greater than the second `Int`, otherwise
 * `false`.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Int.of(3),
 *     Int.greaterThan(Int.of(2))
 *   ),
 *   // data-first api
 *   Int.greaterThan(Int.of(3), Int.of(2))
 * )
 * ```
 *
 * @memberof Int
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
  (that: Int): (self: Int) => boolean

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
  (self: Int, that: Int): boolean
} = _Order.greaterThan(Order)

/**
 * Returns a function that checks if a given `Int` is greater than or equal to
 * the provided one.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   pipe(
 *     // data-last api
 *     Int.of(3),
 *     Int.greaterThanOrEqualTo(Int.of(2))
 *   ),
 *   // data-first api
 *   Int.greaterThanOrEqualTo(Int.of(3), Int.of(2))
 * )
 * ```
 *
 * @memberof Int
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
   *     Int.empty, //
   *     Int.greaterThanOrEqualTo(Int.of(-Int.empty))
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
  (that: Int): (self: Int) => boolean

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
   *   Int.greaterThanOrEqualTo(Int.empty, Int.of(-Int.empty)),
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
  (self: Int, that: Int): boolean
} = _Order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `Int` is between a minimum and maximum value (inclusive).
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(
 *     Int.of(3),
 *     Int.between({ minimum: Int.of(0), maximum: Int.of(5) })
 *   ),
 *   // data-first api
 *   Int.between(Int.of(3), { minimum: Int.of(0), maximum: Int.of(5) })
 * )
 * ```
 *
 * @memberof Int
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
  (options: { minimum: Int; maximum: Int }): (self: Int) => boolean

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
    self: Int,
    options: {
      minimum: Int
      maximum: Int
    }
  ): boolean
} = _Order.between(Order)

/**
 * Restricts the given `Int` to be within the range specified by the `minimum`
 * and `maximum` values.
 *
 * - If the `Int` is less than the `minimum` value, the function returns the
 *   `minimum` value.
 * - If the `Int` is greater than the `maximum` value, the function returns the
 *   `maximum` value.
 * - Otherwise, it returns the original `Int`.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(
 *   // data-last api
 *   pipe(Int.of(3), Int.clamp({ minimum: Int.of(0), maximum: Int.of(5) })),
 *   // data-first api
 *   Int.clamp(Int.of(3), { minimum: Int.of(0), maximum: Int.of(5) })
 * )
 * ```
 *
 * @memberof Int
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
  (options: { minimum: Int; maximum: Int }): (self: Int) => Int

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
    self: Int,
    options: {
      minimum: Int
      maximum: Int
    }
  ): Int
} = _Order.clamp(Order)

/**
 * Returns the minimum between two `Int`s.
 *
 * `Int.min` is a `commutative` operation; this means that the order in which
 * the arguments are provided does not affect the result.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * const three = Int.of(3)
 * const five = Int.of(5)
 *
 * assert.equal(
 *   // data-last api
 *   pipe(three, Int.min(five)),
 *   // data-first api
 *   Int.min(three, five) // returns three
 * )
 * ```
 *
 * @memberof Int
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
  (that: Int): (self: Int) => Int

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
  (self: Int, that: Int): Int
} = _Order.min(Order)

/**
 * Returns the maximum between two `Int`s.
 *
 * **Syntax**
 *
 * ```ts
 * import { Int, pipe } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * const negativeTwo = Int.of(-2)
 * const three = Int.of(3)
 *
 * assert.equal(
 *   // data-last api
 *   Int.max(negativeTwo, three), // returns 3
 *   // data-first api
 *   pipe(negativeTwo, Int.max(three)) // returns 3
 * )
 * ```
 *
 * @memberof Int
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
  (that: Int): (self: Int) => Int

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
  (self: Int, that: Int): Int
} = _Order.max(Order)

/**
 * Determines the sign of a given `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import { Int } from "effect"
 * import * as assert from "node:assert/strict"
 *
 * assert.equal(Int.sign(Int.of(-10)), -1)
 * assert.equal(Int.sign(Int.of(0)), 0)
 * assert.equal(Int.sign(Int.of(10)), 1)
 * ```
 *
 * @param n - The `Int` to determine the sign of.
 * @returns -1 if `n` is negative, 0 if `n` is zero, and 1 if `n` is positive.
 * @experimental
 */
export const sign: (n: Int) => Ordering = (n) => Order(n, zero)

/**
 * Takes an `Iterable` of `Int`s and returns their sum as a single `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int, HashSet } from "effect"
 *
 * assert.equal(
 *   Int.sumAll(HashSet.make(Int.of(-2), Int.of(-3), Int.of(4))), //
 *   Int.of(-1)
 * )
 * ```
 *
 * @param collection - An `Iterable<Int>` to reduce to a sum.
 * @returns The sum of the `Int`s in the `Iterable`.
 * @experimental
 */
export const sumAll: (collection: Iterable<Int, any, any>) => Int = (
  collection
) => _Iterable.reduce(collection, zero, sum)

/**
 * Takes an `Iterable` of `Int`s and returns their multiplication as a single
 * `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert/strict"
 * import { Int, HashSet } from "effect"
 *
 * assert.equal(
 *   Int.multiplyAll(HashSet.make(Int.of(-2), Int.of(-3), Int.of(4))), //
 *   Int.of(24)
 * )
 * ```
 *
 * @param collection - An `Iterable<Int>` to reduce to a product.
 * @returns The product of the `Int`s in the `Iterable`.
 * @experimental
 */
export const multiplyAll: (collection: Iterable<Int>) => Int = (collection) =>
  _Iterable.reduce(collection, one, multiply)

/**
 * Returns the remainder left over when one operand is divided by a second
 * operand.
 *
 * It always takes the sign of the dividend.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @experimental
 * @todo Provide an implementation and tests
 */
export const remainder: {
  (divisor: Int): (dividend: Int) => Int
  (dividend: Int, divisor: Int): Int
} = dual(2, (dividend: Int, divisor: Int): Int => of(dividend % divisor))

/**
 * Returns the next power of 2 from the given `Int`.
 *
 * @memberof Int
 * @since 3.14.6
 * @category Math
 * @experimental
 * @todo Provide an implementation and tests
 */
export const nextPow2 = (int: Int): Int => of(_Number.nextPow2(int))
