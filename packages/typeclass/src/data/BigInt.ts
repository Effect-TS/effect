/**
 * @since 0.24.0
 */

import { Order } from "effect/BigInt"
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * `bigint` semigroup under addition.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupSum } from "@effect/typeclass/data/BigInt"
 *
 * console.log(SemigroupSum.combine(2n, 3n))
 * // 5n
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupSum: semigroup.Semigroup<bigint> = semigroup.make(
  (self, that) => self + that
)

/**
 * `bigint` semigroup under multiplication.
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMultiply: semigroup.Semigroup<bigint> = semigroup.make(
  (self, that) => self * that,
  (self, collection) => {
    if (self === 0n) {
      return 0n
    }
    let out = self
    for (const n of collection) {
      if (n === 0n) {
        return 0n
      }
      out = out * n
    }
    return out
  }
)

/**
 * A `Semigroup` that uses the minimum between two values.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupMin } from "@effect/typeclass/data/BigInt"
 *
 * console.log(SemigroupMin.combine(2n, 3n))
 * // 2n
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMin: semigroup.Semigroup<bigint> = semigroup.min(Order)

/**
 * A `Semigroup` that uses the maximum between two values.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupMax } from "@effect/typeclass/data/BigInt"
 *
 * console.log(SemigroupMax.combine(2n, 3n))
 * // 3n
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMax: semigroup.Semigroup<bigint> = semigroup.max(Order)

/**
 * `bigint` monoid under addition.
 *
 * The `empty` value is `0n`.
 *
 * **Example**
 *
 * ```ts
 * import { MonoidSum } from "@effect/typeclass/data/BigInt"
 *
 * console.log(MonoidSum.combine(2n, 3n))
 * // 5n
 * console.log(MonoidSum.combine(2n, MonoidSum.empty))
 * // 2n
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidSum: monoid.Monoid<bigint> = monoid.fromSemigroup(
  SemigroupSum,
  0n
)

/**
 * `bigint` monoid under multiplication.
 *
 * The `empty` value is `1n`.
 *
 * **Example**
 *
 * ```ts
 * import { MonoidMultiply } from "@effect/typeclass/data/BigInt"
 *
 * console.log(MonoidMultiply.combine(2n, 3n))
 * // 6n
 * console.log(MonoidMultiply.combine(2n, MonoidMultiply.empty))
 * // 2n
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMultiply: monoid.Monoid<bigint> = monoid.fromSemigroup(
  SemigroupMultiply,
  1n
)
