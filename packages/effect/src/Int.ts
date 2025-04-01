/** @module Int */

import * as Brand from "./Brand.js"
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
