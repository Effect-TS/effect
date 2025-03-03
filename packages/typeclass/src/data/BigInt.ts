/**
 * @since 0.24.0
 */

import { Order } from "effect/BigInt"
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * `bigint` semigroup under addition.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { SemigroupSum } from "@effect/typeclass/data/BigInt"
 *
 * assert.deepStrictEqual(SemigroupSum.combine(2n, 3n), 5n)
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
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { SemigroupMin } from "@effect/typeclass/data/BigInt"
 *
 * assert.deepStrictEqual(SemigroupMin.combine(2n, 3n), 2n)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMin: semigroup.Semigroup<bigint> = semigroup.min(Order)

/**
 * A `Semigroup` that uses the maximum between two values.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { SemigroupMax } from "@effect/typeclass/data/BigInt"
 *
 * assert.deepStrictEqual(SemigroupMax.combine(2n, 3n), 3n)
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
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { MonoidSum } from "@effect/typeclass/data/BigInt"
 *
 * assert.deepStrictEqual(MonoidSum.combine(2n, 3n), 5n)
 * assert.deepStrictEqual(MonoidSum.combine(2n, MonoidSum.empty), 2n)
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
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { MonoidMultiply } from "@effect/typeclass/data/BigInt"
 *
 * assert.deepStrictEqual(MonoidMultiply.combine(2n, 3n), 6n)
 * assert.deepStrictEqual(MonoidMultiply.combine(2n, MonoidMultiply.empty), 2n)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMultiply: monoid.Monoid<bigint> = monoid.fromSemigroup(
  SemigroupMultiply,
  1n
)
