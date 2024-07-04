/**
 * @since 0.24.0
 */
import type { Ordering } from "effect/Ordering"
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * `Semigroup` instance for `Ordering`, returns the left-most non-zero `Ordering`.
 *
 * @example
 * import { Semigroup } from "@effect/typeclass/data/Ordering"
 *
 * assert.deepStrictEqual(Semigroup.combine(0, -1), -1)
 * assert.deepStrictEqual(Semigroup.combine(0, 1), 1)
 * assert.deepStrictEqual(Semigroup.combine(1, -1), 1)
 *
 * @category instances
 * @since 0.24.0
 */
export const Semigroup: semigroup.Semigroup<Ordering> = semigroup.make(
  (self, that) => self !== 0 ? self : that,
  (self, collection) => {
    let ordering = self
    if (ordering !== 0) {
      return ordering
    }
    for (ordering of collection) {
      if (ordering !== 0) {
        return ordering
      }
    }
    return ordering
  }
)

/**
 * `Monoid` instance for `Ordering`, returns the left-most non-zero `Ordering`.
 *
 * The `empty` value is `0`.
 *
 * @example
 * import { Monoid } from "@effect/typeclass/data/Ordering"
 *
 * assert.deepStrictEqual(Monoid.combine(Monoid.empty, -1), -1)
 * assert.deepStrictEqual(Monoid.combine(Monoid.empty, 1), 1)
 * assert.deepStrictEqual(Monoid.combine(1, -1), 1)
 *
 * @category instances
 * @since 0.24.0
 */
export const Monoid: monoid.Monoid<Ordering> = monoid.fromSemigroup(Semigroup, 0)
