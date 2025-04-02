/** @module Int */

import * as Brand from "./Brand.js"
import { dual } from "./Function.js"
import * as _Number from "./Number.js"
import type * as Predicate from "./Predicate.js"

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
export type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
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
 * const n = Int.of(1)
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
export const isInt: Predicate.Refinement<unknown, Int> = (input) => _Number.isNumber(input) && Int.is(input)

/**
 * Provides an addition operation on `Int`.
 *
 * It supports multiple method signatures, allowing for both curried and direct
 * invocation styles with integers and floating-point numbers.
 *
 * @memberOf Int
 * @category: math
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
