/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 * @module Number
 */
import * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as internal from "./internal/number.js"
import * as option from "./internal/option.js"
import type { Option } from "./Option.js"
import * as order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import * as predicate from "./Predicate.js"

/**
 * Tests if a value is a `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNumber } from "effect/Number"
 *
 * assert.deepStrictEqual(isNumber(2), true)
 * assert.deepStrictEqual(isNumber("2"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isNumber: (input: unknown) => input is number = predicate.isNumber

/**
 * Provides an addition operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sum } from "effect/Number"
 *
 * assert.deepStrictEqual(sum(2, 3), 5)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sum: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, internal.sum)

/**
 * Provides a multiplication operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiply } from "effect/Number"
 *
 * assert.deepStrictEqual(multiply(2, 3), 6)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiply: {
  (multiplicand: number): (multiplier: number) => number
  (multiplier: number, multiplicand: number): number
} = dual(2, internal.multiply)

/**
 * Provides a subtraction operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { subtract } from "effect/Number"
 *
 * assert.deepStrictEqual(subtract(2, 3), -1)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const subtract: {
  (subtrahend: number): (minuend: number) => number
  (minuend: number, subtrahend: number): number
} = dual(2, internal.subtract)

/**
 * Provides a division operation on `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Number, Option } from "effect"
 *
 * assert.deepStrictEqual(Number.divide(6, 3), Option.some(2))
 * assert.deepStrictEqual(Number.divide(6, 0), Option.none())
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const divide: {
  (divisor: number): (dividend: number) => Option<number>
  (dividend: number, divisor: number): Option<number>
} = dual(2, internal.divide)

/**
 * Represents errors that can occur during division operations.
 *
 * @memberof Number
 * @since 3.14.6
 * @category Errors
 * @experimental
 */
export const DivisionByZeroError = internal.DivisionByZeroError

/**
 * Provides a division operation on `number`s.
 *
 * As the name suggests, **this operation may throw an
 * {@link module:Number.DivisionByZeroError}** if the `divisor` is zero, resulting
 * in either a division by zero or an indeterminate form.
 *
 * @since 2.0.0
 * @category Math
 * @example
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { unsafeDivide } from "effect/Number"
 *
 * assert.deepStrictEqual(unsafeDivide(6, 3), 2)
 * ```
 *
 * @throws - An {@link module:Number.DivisionByZeroError} if the divisor is zero.
 */
export const unsafeDivide: {
  (divisor: number): (dividend: number) => number
  (dividend: number, divisor: number): number
} = dual(2, internal.unsafeDivide)

/**
 * Returns the result of adding `1` to a given number.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { increment } from "effect/Number"
 *
 * assert.deepStrictEqual(increment(2), 3)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const increment: (n: number) => number = internal.increment

/**
 * Decrements a number by `1`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { decrement } from "effect/Number"
 *
 * assert.deepStrictEqual(decrement(3), 2)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const decrement: (n: number) => number = internal.decrement

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<number> = equivalence.number

/**
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<number> = order.number

/**
 * Returns `true` if the first argument is less than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThan } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThan(2, 3), true)
 * assert.deepStrictEqual(lessThan(3, 3), false)
 * assert.deepStrictEqual(lessThan(4, 3), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThan(Order)

/**
 * Returns a function that checks if a given `number` is less than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { lessThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(2, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(4, 3), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const lessThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise `false`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThan } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThan(2, 3), false)
 * assert.deepStrictEqual(greaterThan(3, 3), false)
 * assert.deepStrictEqual(greaterThan(4, 3), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThan: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThan(Order)

/**
 * Returns a function that checks if a given `number` is greater than or equal to the provided one.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { greaterThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(2, 3), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(4, 3), true)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const greaterThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `number` is between a `minimum` and `maximum` value (inclusive).
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Number } from "effect"
 *
 * const between = Number.between({ minimum: 0, maximum: 5 })
 *
 * assert.deepStrictEqual(between(3), true)
 * assert.deepStrictEqual(between(-1), false)
 * assert.deepStrictEqual(between(6), false)
 * ```
 *
 * @category predicates
 * @since 2.0.0
 */
export const between: {
  (options: {
    minimum: number
    maximum: number
  }): (self: number) => boolean
  (self: number, options: {
    minimum: number
    maximum: number
  }): boolean
} = order.between(Order)

/**
 * Restricts the given `number` to be within the range specified by the `minimum` and `maximum` values.
 *
 * - If the `number` is less than the `minimum` value, the function returns the `minimum` value.
 * - If the `number` is greater than the `maximum` value, the function returns the `maximum` value.
 * - Otherwise, it returns the original `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Number } from "effect"
 *
 * const clamp = Number.clamp({ minimum: 1, maximum: 5 })
 *
 * assert.equal(clamp(3), 3)
 * assert.equal(clamp(0), 1)
 * assert.equal(clamp(6), 5)
 * ```
 *
 * @since 2.0.0
 */
export const clamp: {
  (options: {
    minimum: number
    maximum: number
  }): (self: number) => number
  (self: number, options: {
    minimum: number
    maximum: number
  }): number
} = order.clamp(Order)

/**
 * Returns the minimum between two `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { min } from "effect/Number"
 *
 * assert.deepStrictEqual(min(2, 3), 2)
 * ```
 *
 * @since 2.0.0
 */
export const min: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.min(Order)

/**
 * Returns the maximum between two `number`s.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { max } from "effect/Number"
 *
 * assert.deepStrictEqual(max(2, 3), 3)
 * ```
 *
 * @since 2.0.0
 */
export const max: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = order.max(Order)

/**
 * Determines the sign of a given `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sign } from "effect/Number"
 *
 * assert.deepStrictEqual(sign(-5), -1)
 * assert.deepStrictEqual(sign(0), 0)
 * assert.deepStrictEqual(sign(5), 1)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sign = (n: number): Ordering => Order(n, 0)

/**
 * Takes an `Iterable` of `number`s and returns their sum as a single `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { sumAll } from "effect/Number"
 *
 * assert.deepStrictEqual(sumAll([2, 3, 4]), 9)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const sumAll: {
  (collection: Iterable<number>): number
} = internal.sumAll<number>

/**
 * Takes an `Iterable` of `number`s and returns their multiplication as a single `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { multiplyAll } from "effect/Number"
 *
 * assert.deepStrictEqual(multiplyAll([2, 3, 4]), 24)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const multiplyAll: (collection: Iterable<number>) => number = internal.multiplyAll

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * It always takes the sign of the dividend.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { remainder } from "effect/Number"
 *
 * assert.deepStrictEqual(remainder(2, 2), 0)
 * assert.deepStrictEqual(remainder(3, 2), 1)
 * assert.deepStrictEqual(remainder(-4, 2), -0)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const remainder: {
  (divisor: number): (dividend: number) => number
  (dividend: number, divisor: number): number
} = dual(2, internal.remainder)

/**
 * Returns the next power of 2 from the given number.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { nextPow2 } from "effect/Number"
 *
 * assert.deepStrictEqual(nextPow2(5), 8)
 * assert.deepStrictEqual(nextPow2(17), 32)
 * ```
 *
 * @category math
 * @since 2.0.0
 */
export const nextPow2: (n: number) => number = internal.nextPow2

/**
 * Tries to parse a `number` from a `string` using the `Number()` function.
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @category constructors
 * @since 2.0.0
 */
export const parse = (s: string): Option<number> => {
  if (s === "NaN") {
    return option.some(NaN)
  }
  if (s === "Infinity") {
    return option.some(Infinity)
  }
  if (s === "-Infinity") {
    return option.some(-Infinity)
  }
  if (s.trim() === "") {
    return option.none
  }
  const n = Number(s)
  return Number.isNaN(n)
    ? option.none
    : option.some(n)
}

/**
 * Returns the number rounded with the given precision.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { round } from "effect/Number"
 *
 * assert.deepStrictEqual(round(1.1234, 2), 1.12)
 * assert.deepStrictEqual(round(1.567, 2), 1.57)
 * ```
 *
 * @category math
 * @since 3.8.0
 */
export const round: {
  (precision: number): (self: number) => number
  (self: number, precision: number): number
} = dual(2, (self: number, precision: number): number => {
  const factor = Math.pow(10, precision)
  return Math.round(self * factor) / factor
})
