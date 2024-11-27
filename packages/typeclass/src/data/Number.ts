/**
 * @since 0.24.0
 */
import * as Number from "effect/Number"
import * as bounded from "../Bounded.js"
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * @category instances
 * @since 0.24.0
 */
export const Bounded: bounded.Bounded<number> = {
  compare: Number.Order,
  maxBound: Infinity,
  minBound: -Infinity
}

/**
 * `number` semigroup under addition.
 *
 * @example
 * ```ts
 * import { SemigroupSum } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(SemigroupSum.combine(2, 3), 5)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupSum: semigroup.Semigroup<number> = semigroup.make((self, that) => self + that)

/**
 * `number` semigroup under multiplication.
 *
 * @example
 * ```ts
 * import { SemigroupMultiply } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(SemigroupMultiply.combine(2, 3), 6)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMultiply: semigroup.Semigroup<number> = semigroup.make(
  (self, that) => self * that,
  (self, collection) => {
    if (self === 0) {
      return 0
    }
    let out = self
    for (const n of collection) {
      if (n === 0) {
        return 0
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
 * import { SemigroupMin } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(SemigroupMin.combine(2, 3), 2)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMin: semigroup.Semigroup<number> = semigroup.min(Number.Order)

/**
 * A `Semigroup` that uses the maximum between two values.
 *
 * @example
 * ```ts
 * import { SemigroupMax } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(SemigroupMax.combine(2, 3), 3)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMax: semigroup.Semigroup<number> = semigroup.max(Number.Order)

/**
 * `number` monoid under addition.
 *
 * The `empty` value is `0`.
 *
 * @example
 * ```ts
 * import { MonoidSum } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(MonoidSum.combine(2, 3), 5)
 * assert.deepStrictEqual(MonoidSum.combine(2, MonoidSum.empty), 2)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidSum: monoid.Monoid<number> = monoid.fromSemigroup(SemigroupSum, 0)

/**
 * `number` monoid under multiplication.
 *
 * The `empty` value is `1`.
 *
 * @example
 * ```ts
 * import { MonoidMultiply } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(MonoidMultiply.combine(2, 3), 6)
 * assert.deepStrictEqual(MonoidMultiply.combine(2, MonoidMultiply.empty), 2)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMultiply: monoid.Monoid<number> = monoid.fromSemigroup(SemigroupMultiply, 1)

/**
 * A `Monoid` that uses the minimum between two values.
 *
 * The `empty` value is `-Infinity`.
 *
 * @example
 * ```ts
 * import { MonoidMin } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(MonoidMin.combine(2, 3), 2)
 * assert.deepStrictEqual(MonoidMin.combine(2, MonoidMin.empty), 2)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMin: monoid.Monoid<number> = bounded.min(Bounded)

/**
 * A `Monoid` that uses the maximum between two values.
 *
 * The `empty` value is `Infinity`.
 *
 * @example
 * ```ts
 * import { MonoidMax } from "@effect/typeclass/data/Number"
 *
 * assert.deepStrictEqual(MonoidMax.combine(2, 3), 3)
 * assert.deepStrictEqual(MonoidMax.combine(2, MonoidMax.empty), 2)
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMax: monoid.Monoid<number> = bounded.max(Bounded)
