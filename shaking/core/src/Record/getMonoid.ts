import type { Monoid } from "../Monoid"
import { getMonoid as getMonoid_1 } from "../Readonly/Record"
import type { Semigroup } from "../Semigroup"

/**
 * Returns a `Semigroup` instance for records given a `Semigroup` instance for their values
 *
 * @example
 * import { semigroupSum } from 'fp-ts/lib/Semigroup'
 * import { getMonoid } from 'fp-ts/lib/Record'
 *
 * const M = getMonoid(semigroupSum)
 * assert.deepStrictEqual(M.concat({ foo: 123 }, { foo: 456 }), { foo: 579 })
 *
 * @since 2.0.0
 */
export function getMonoid<K extends string, A>(S: Semigroup<A>): Monoid<Record<K, A>>
export function getMonoid<A>(S: Semigroup<A>): Monoid<Record<string, A>> {
  return getMonoid_1(S)
}
