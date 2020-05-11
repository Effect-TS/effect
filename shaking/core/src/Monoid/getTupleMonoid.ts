import { getTupleSemigroup, Semigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * Given a tuple of monoids returns a monoid for the tuple
 *
 * @example
 * import { getTupleMonoid, monoidString, monoidSum, monoidAll } from 'fp-ts/lib/Monoid'
 *
 * const M1 = getTupleMonoid(monoidString, monoidSum)
 * assert.deepStrictEqual(M1.concat(['a', 1], ['b', 2]), ['ab', 3])
 *
 * const M2 = getTupleMonoid(monoidString, monoidSum, monoidAll)
 * assert.deepStrictEqual(M2.concat(['a', 1, true], ['b', 2, false]), ['ab', 3, false])
 *
 * @since 2.0.0
 */
export function getTupleMonoid<T extends ReadonlyArray<Monoid<any>>>(
  ...monoids: T
): Monoid<
  {
    [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never
  }
> {
  return {
    concat: getTupleSemigroup(...monoids).concat,
    empty: monoids.map((m) => m.empty)
  } as any
}
