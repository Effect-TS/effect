/**
 * This module provides utility functions and type class instances for working with the `number` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */
import * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as option from "./internal/option.js"
import type { Option } from "./Option.js"
import * as order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import * as predicate from "./Predicate.js"

/**
 * Tests if a value is a `number`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isNumber } from "effect/Number"
 *
 * assert.deepStrictEqual(isNumber(2), true)
 * assert.deepStrictEqual(isNumber("2"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNumber: (input: unknown) => input is number = predicate.isNumber

/**
 * Provides an addition operation on `number`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { sum } from "effect/Number"
 *
 * assert.deepStrictEqual(sum(2, 3), 5)
 *
 * @category math
 * @since 2.0.0
 */
export const sum: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self + that)

/**
 * Provides a multiplication operation on `number`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { multiply } from "effect/Number"
 *
 * assert.deepStrictEqual(multiply(2, 3), 6)
 *
 * @category math
 * @since 2.0.0
 */
export const multiply: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self * that)

/**
 * Provides a subtraction operation on `number`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { subtract } from "effect/Number"
 *
 * assert.deepStrictEqual(subtract(2, 3), -1)
 *
 * @category math
 * @since 2.0.0
 */
export const subtract: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self - that)

/**
 * Provides a division operation on `number`s.
 *
 * @param self - The dividend operand.
 * @param that - The divisor operand.
 *
 * @example
 * import { Number, Option } from "effect"
 *
 * assert.deepStrictEqual(Number.divide(6, 3), Option.some(2))
 * assert.deepStrictEqual(Number.divide(6, 0), Option.none())
 *
 * @category math
 * @since 2.0.0
 */
export const divide: {
  (that: number): (self: number) => Option<number>
  (self: number, that: number): Option<number>
} = dual(
  2,
  (self: number, that: number): Option<number> => that === 0 ? option.none : option.some(self / that)
)

/**
 * Provides a division operation on `number`s.
 *
 * Throws a `RangeError` if the divisor is `0`.
 *
 * @param self - The dividend operand.
 * @param that - The divisor operand.
 *
 * @example
 * import { unsafeDivide } from "effect/Number"
 *
 * assert.deepStrictEqual(unsafeDivide(6, 3), 2)
 *
 * @category math
 * @since 2.0.0
 */
export const unsafeDivide: {
  (that: number): (self: number) => number
  (self: number, that: number): number
} = dual(2, (self: number, that: number): number => self / that)

/**
 * Returns the result of adding `1` to a given number.
 *
 * @param n - A `number` to be incremented.
 *
 * @example
 * import { increment } from "effect/Number"
 *
 * assert.deepStrictEqual(increment(2), 3)
 *
 * @category math
 * @since 2.0.0
 */
export const increment = (n: number): number => n + 1

/**
 * Decrements a number by `1`.
 *
 * @param n - A `number` to be decremented.
 *
 * @example
 * import { decrement } from "effect/Number"
 *
 * assert.deepStrictEqual(decrement(3), 2)
 *
 * @category math
 * @since 2.0.0
 */
export const decrement = (n: number): number => n - 1

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
 * @param self - The first argument.
 * @param that - The second argument.
 *
 * @example
 * import { lessThan } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThan(2, 3), true)
 * assert.deepStrictEqual(lessThan(3, 3), false)
 * assert.deepStrictEqual(lessThan(4, 3), false)
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
 * @param self - The first `number` to compare with.
 * @param that - The second `number` to compare with.
 *
 * @example
 * import { lessThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(2, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(4, 3), false)
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
 * @param self - The first argument.
 * @param that - The second argument.
 *
 * @example
 * import { greaterThan } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThan(2, 3), false)
 * assert.deepStrictEqual(greaterThan(3, 3), false)
 * assert.deepStrictEqual(greaterThan(4, 3), true)
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
 * @param self - The first `number` to compare with.
 * @param that - The second `number` to compare with.
 *
 * @example
 * import { greaterThanOrEqualTo } from "effect/Number"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(2, 3), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(3, 3), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(4, 3), true)
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
 * @param self - The `number` to check.
 * @param minimum - The `minimum` value to check.
 * @param maximum - The `maximum` value to check.
 *
 * @example
 * import { Number } from "effect"
 *
 * const between = Number.between({ minimum: 0, maximum: 5 })
 *
 * assert.deepStrictEqual(between(3), true)
 * assert.deepStrictEqual(between(-1), false)
 * assert.deepStrictEqual(between(6), false)
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
 * @param self - The `number` to be clamped.
 * @param minimum - The lower end of the range.
 * @param maximum - The upper end of the range.
 *
 * @example
 * import { Number } from "effect"
 *
 * const clamp = Number.clamp({ minimum: 1, maximum: 5 })
 *
 * assert.equal(clamp(3), 3)
 * assert.equal(clamp(0), 1)
 * assert.equal(clamp(6), 5)
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
 * @param self - The first `number`.
 * @param that - The second `number`.
 *
 * @example
 * import { min } from "effect/Number"
 *
 * assert.deepStrictEqual(min(2, 3), 2)
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
 * @param self - The first `number`.
 * @param that - The second `number`.
 *
 * @example
 * import { max } from "effect/Number"
 *
 * assert.deepStrictEqual(max(2, 3), 3)
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
 * @param n - The `number` to determine the sign of.
 *
 * @example
 * import { sign } from "effect/Number"
 *
 * assert.deepStrictEqual(sign(-5), -1)
 * assert.deepStrictEqual(sign(0), 0)
 * assert.deepStrictEqual(sign(5), 1)
 *
 * @category math
 * @since 2.0.0
 */
export const sign = (n: number): Ordering => Order(n, 0)

/**
 * Takes an `Iterable` of `number`s and returns their sum as a single `number`.
 *
 * @param collection - The collection of `number`s to sum.
 *
 * @example
 * import { sumAll } from "effect/Number"
 *
 * assert.deepStrictEqual(sumAll([2, 3, 4]), 9)
 *
 * @category math
 * @since 2.0.0
 */
export const sumAll = (collection: Iterable<number>): number => {
  let out = 0
  for (const n of collection) {
    out += n
  }
  return out
}

/**
 * Takes an `Iterable` of `number`s and returns their multiplication as a single `number`.
 *
 * @param collection - The collection of `number`s to multiply.
 *
 * @example
 * import { multiplyAll } from "effect/Number"
 *
 * assert.deepStrictEqual(multiplyAll([2, 3, 4]), 24)
 *
 * @category math
 * @since 2.0.0
 */
export const multiplyAll = (collection: Iterable<number>): number => {
  let out = 1
  for (const n of collection) {
    if (n === 0) {
      return 0
    }
    out *= n
  }
  return out
}

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * It always takes the sign of the dividend.
 *
 * @param self - The dividend.
 * @param divisor - The divisor.
 *
 * @example
 * import { remainder } from "effect/Number"
 *
 * assert.deepStrictEqual(remainder(2, 2), 0)
 * assert.deepStrictEqual(remainder(3, 2), 1)
 * assert.deepStrictEqual(remainder(-4, 2), -0)
 *
 * @category math
 * @since 2.0.0
 */
export const remainder: {
  (divisor: number): (self: number) => number
  (self: number, divisor: number): number
} = dual(2, (self: number, divisor: number): number => {
  // https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
  const selfDecCount = (self.toString().split(".")[1] || "").length
  const divisorDecCount = (divisor.toString().split(".")[1] || "").length
  const decCount = selfDecCount > divisorDecCount ? selfDecCount : divisorDecCount
  const selfInt = parseInt(self.toFixed(decCount).replace(".", ""))
  const divisorInt = parseInt(divisor.toFixed(decCount).replace(".", ""))
  return (selfInt % divisorInt) / Math.pow(10, decCount)
})

/**
 * Returns the next power of 2 from the given number.
 *
 * @param self - The number to find the next power of 2 from.
 *
 * @example
 * import { nextPow2 } from "effect/Number"
 *
 * assert.deepStrictEqual(nextPow2(5), 8)
 * assert.deepStrictEqual(nextPow2(17), 32)
 *
 * @category math
 * @since 2.0.0
 */
export const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}

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
