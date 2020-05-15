import type { Monoid } from "../../Monoid"
import type { Semigroup } from "../../Semigroup"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"
import { empty } from "./empty"

/**
 * Returns a `Semigroup` instance for records given a `Semigroup` instance for their values
 *
 * @example
 * import { semigroupSum } from 'fp-ts/lib/Semigroup'
 * import { getMonoid } from 'fp-ts/lib/ReadonlyRecord'
 *
 * const M = getMonoid(semigroupSum)
 * assert.deepStrictEqual(M.concat({ foo: 123 }, { foo: 456 }), { foo: 579 })
 *
 * @since 2.5.0
 */
export function getMonoid<K extends string, A>(
  S: Semigroup<A>
): Monoid<ReadonlyRecord<K, A>>
export function getMonoid<A>(S: Semigroup<A>): Monoid<ReadonlyRecord<string, A>> {
  return {
    concat: (x, y) => {
      if (x === empty) {
        return y
      }
      if (y === empty) {
        return x
      }
      const keys = Object.keys(y)
      const len = keys.length
      if (len === 0) {
        return x
      }
      const r: Record<string, A> = { ...x }
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        r[k] = _hasOwnProperty.call(x, k) ? S.concat(x[k], y[k]) : y[k]
      }
      return r
    },
    empty
  }
}
