/* adapted from https://github.com/gcanti/fp-ts */

import { Endomorphism, identity } from "../Function"
import type { Bounded } from "../Ord"
import type { Record } from "../Record"
import {
  fold as foldSemigroup,
  getDualSemigroup,
  getFunctionSemigroup,
  getJoinSemigroup,
  getMeetSemigroup,
  getStructSemigroup,
  getTupleSemigroup,
  Semigroup,
  semigroupAll,
  semigroupAny,
  semigroupProduct,
  semigroupString,
  semigroupSum,
  semigroupVoid
} from "../Semigroup"

export interface Monoid<A> extends Semigroup<A> {
  readonly empty: A
}

export function fold<A>(M: Monoid<A>): (as: ReadonlyArray<A>) => A {
  const foldM = foldSemigroup(M)
  return (as) => foldM(M.empty, as)
}

/**
 * The dual of a `Monoid`, obtained by swapping the arguments of `concat`.
 *
 * @example
 * import { getDualMonoid, monoidString } from '@matechs/core/Monoid'
 *
 * assert.deepStrictEqual(getDualMonoid(monoidString).concat('a', 'b'), 'ba')
 */
export function getDualMonoid<A>(M: Monoid<A>): Monoid<A> {
  return {
    concat: getDualSemigroup(M).concat,
    empty: M.empty
  }
}

export function getEndomorphismMonoid<A = never>(): Monoid<Endomorphism<A>> {
  return {
    concat: (x, y) => (a) => x(y(a)),
    empty: identity
  }
}

export function getFunctionMonoid<M>(
  M: Monoid<M>
): <A = never>() => Monoid<(a: A) => M> {
  return () => ({
    concat: getFunctionSemigroup(M)<any>().concat,
    empty: () => M.empty
  })
}

export function getJoinMonoid<A>(B: Bounded<A>): Monoid<A> {
  return {
    concat: getJoinSemigroup(B).concat,
    empty: B.bottom
  }
}

export function getMeetMonoid<A>(B: Bounded<A>): Monoid<A> {
  return {
    concat: getMeetSemigroup(B).concat,
    empty: B.top
  }
}

export function getStructMonoid<O extends Record<string, any>>(
  monoids: {
    [K in keyof O]: Monoid<O[K]>
  }
): Monoid<O> {
  const empty: any = {}
  for (const key of Object.keys(monoids)) {
    empty[key] = monoids[key].empty
  }
  return {
    concat: getStructSemigroup<O>(monoids).concat,
    empty
  }
}

/**
 * Given a tuple of monoids returns a monoid for the tuple
 *
 * @example
 * import { getTupleMonoid, monoidString, monoidSum, monoidAll } from '@matechs/core/Monoid'
 *
 * const M1 = getTupleMonoid(monoidString, monoidSum)
 * assert.deepStrictEqual(M1.concat(['a', 1], ['b', 2]), ['ab', 3])
 *
 * const M2 = getTupleMonoid(monoidString, monoidSum, monoidAll)
 * assert.deepStrictEqual(M2.concat(['a', 1, true], ['b', 2, false]), ['ab', 3, false])
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

/**
 * Boolean monoid under conjunction
 */
export const monoidAll: Monoid<boolean> = {
  concat: semigroupAll.concat,
  empty: true
}

/**
 * Boolean monoid under disjunction
 */
export const monoidAny: Monoid<boolean> = {
  concat: semigroupAny.concat,
  empty: false
}

/**
 * Number monoid under multiplication
 */
export const monoidProduct: Monoid<number> = {
  concat: semigroupProduct.concat,
  empty: 1
}

export const monoidString: Monoid<string> = {
  concat: semigroupString.concat,
  empty: ""
}

/**
 * Number monoid under addition
 */
export const monoidSum: Monoid<number> = {
  concat: semigroupSum.concat,
  empty: 0
}

export const monoidVoid: Monoid<void> = {
  concat: semigroupVoid.concat,
  empty: undefined
}
