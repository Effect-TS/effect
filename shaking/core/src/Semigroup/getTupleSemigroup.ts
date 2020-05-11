import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Given a tuple of semigroups returns a semigroup for the tuple
 *
 * @example
 * import { getTupleSemigroup, semigroupString, semigroupSum, semigroupAll } from 'fp-ts/lib/Semigroup'
 *
 * const S1 = getTupleSemigroup(semigroupString, semigroupSum)
 * assert.deepStrictEqual(S1.concat(['a', 1], ['b', 2]), ['ab', 3])
 *
 * const S2 = getTupleSemigroup(semigroupString, semigroupSum, semigroupAll)
 * assert.deepStrictEqual(S2.concat(['a', 1, true], ['b', 2, false]), ['ab', 3, false])
 *
 * @since 2.0.0
 */
export function getTupleSemigroup<T extends ReadonlyArray<Semigroup<any>>>(
  ...semigroups: T
): Semigroup<
  {
    [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never
  }
> {
  return {
    concat: (x, y) => semigroups.map((s, i) => s.concat(x[i], y[i])) as any
  }
}
