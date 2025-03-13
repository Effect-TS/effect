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
 * **Example**
 *
 * ```ts
 * import { SemigroupSum } from "@effect/typeclass/data/Number"
 *
 * console.log(SemigroupSum.combine(2, 3))
 * // 5
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupSum: semigroup.Semigroup<number> = semigroup.make((self, that) => self + that)

/**
 * `number` semigroup under multiplication.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupMultiply } from "@effect/typeclass/data/Number"
 *
 * console.log(SemigroupMultiply.combine(2, 3))
 * // 6
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
 * **Example**
 *
 * ```ts
 * import { SemigroupMin } from "@effect/typeclass/data/Number"
 *
 * console.log(SemigroupMin.combine(2, 3))
 * // 2
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupMin: semigroup.Semigroup<number> = semigroup.min(Number.Order)

/**
 * A `Semigroup` that uses the maximum between two values.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupMax } from "@effect/typeclass/data/Number"
 *
 * console.log(SemigroupMax.combine(2, 3))
 * // 3
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
 * **Example**
 *
 * ```ts
 * import { MonoidSum } from "@effect/typeclass/data/Number"
 *
 * console.log(MonoidSum.combine(2, 3))
 * // 5
 * console.log(MonoidSum.combine(2, MonoidSum.empty))
 * // 2
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
 * **Example**
 *
 * ```ts
 * import { MonoidMultiply } from "@effect/typeclass/data/Number"
 *
 * console.log(MonoidMultiply.combine(2, 3))
 * // 6
 * console.log(MonoidMultiply.combine(2, MonoidMultiply.empty))
 * // 2
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
 * **Example**
 *
 * ```ts
 * import { MonoidMin } from "@effect/typeclass/data/Number"
 *
 * console.log(MonoidMin.combine(2, 3))
 * // 2
 * console.log(MonoidMin.combine(2, MonoidMin.empty))
 * // 2
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
 * **Example**
 *
 * ```ts
 * import { MonoidMax } from "@effect/typeclass/data/Number"
 *
 * console.log(MonoidMax.combine(2, 3))
 * // 3
 * console.log(MonoidMax.combine(2, MonoidMax.empty))
 * // 2
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidMax: monoid.Monoid<number> = bounded.max(Bounded)
