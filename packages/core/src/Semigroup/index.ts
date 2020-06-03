/* adapted from https://github.com/gcanti/fp-ts */

import { identity } from "../Function"
import { Magma } from "../Magma"
import { max, min, Ord } from "../Ord"
import { Record } from "../Record"

/**
 * A `Semigroup` is a `Magma` where `concat` is associative, that is:
 *
 * Associativiy: `concat(concat(x, y), z) = concat(x, concat(y, z))`
 */

export interface Semigroup<A> extends Magma<A> {}

export function fold<A>(S: Semigroup<A>): (a: A, as: ReadonlyArray<A>) => A {
  return (a, as) => as.reduce(S.concat, a)
}

export function getFirstSemigroup<A = never>(): Semigroup<A> {
  return { concat: identity }
}

export function getLastSemigroup<A = never>(): Semigroup<A> {
  return { concat: (_, y) => y }
}

/**
 * Given a tuple of semigroups returns a semigroup for the tuple
 *
 * @example
 * import { getTupleSemigroup, semigroupString, semigroupSum, semigroupAll } from '@matechs/core/Semigroup'
 *
 * const S1 = getTupleSemigroup(semigroupString, semigroupSum)
 * assert.deepStrictEqual(S1.concat(['a', 1], ['b', 2]), ['ab', 3])
 *
 * const S2 = getTupleSemigroup(semigroupString, semigroupSum, semigroupAll)
 * assert.deepStrictEqual(S2.concat(['a', 1, true], ['b', 2, false]), ['ab', 3, false])
 */
export function getTupleSemigroup<T extends ReadonlyArray<Semigroup<any>>>(
  ...semigroups: T
): Semigroup<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> {
  return {
    concat: (x, y) => semigroups.map((s, i) => s.concat(x[i], y[i])) as any
  }
}

/**
 * The dual of a `Semigroup`, obtained by swapping the arguments of `concat`.
 *
 * @example
 * import { getDualSemigroup, semigroupString } from '@matechs/core/Semigroup'
 *
 * assert.deepStrictEqual(getDualSemigroup(semigroupString).concat('a', 'b'), 'ba')
 */
export function getDualSemigroup<A>(S: Semigroup<A>): Semigroup<A> {
  return {
    concat: (x, y) => S.concat(y, x)
  }
}

export function getFunctionSemigroup<S>(
  S: Semigroup<S>
): <A = never>() => Semigroup<(a: A) => S> {
  return () => ({
    concat: (f, g) => (a) => S.concat(f(a), g(a))
  })
}

export function getStructSemigroup<O extends Record<string, any>>(
  semigroups: { [K in keyof O]: Semigroup<O[K]> }
): Semigroup<O> {
  return {
    concat: (x, y) => {
      const r: any = {}
      for (const key of Object.keys(semigroups)) {
        r[key] = semigroups[key].concat(x[key], y[key])
      }
      return r
    }
  }
}

export function getMeetSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return {
    concat: min(O)
  }
}

export function getJoinSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return {
    concat: max(O)
  }
}

/**
 * Returns a `Semigroup` instance for objects preserving their type
 *
 * @example
 * import { getObjectSemigroup } from '@matechs/core/Semigroup'
 *
 * interface Person {
 *   name: string
 *   age: number
 * }
 *
 * const S = getObjectSemigroup<Person>()
 * assert.deepStrictEqual(S.concat({ name: 'name', age: 23 }, { name: 'name', age: 24 }), { name: 'name', age: 24 })
 */
export function getObjectSemigroup<A extends object = never>(): Semigroup<A> {
  return {
    concat: (x, y) => Object.assign({}, x, y)
  }
}

/**
 * Boolean semigroup under conjunction
 */
export const semigroupAll: Semigroup<boolean> = {
  concat: (x, y) => x && y
}

/**
 * Boolean semigroup under disjunction
 */
export const semigroupAny: Semigroup<boolean> = {
  concat: (x, y) => x || y
}

/**
 * Number `Semigroup` under addition
 */
export const semigroupSum: Semigroup<number> = {
  concat: (x, y) => x + y
}

/**
 * Number `Semigroup` under multiplication
 */
export const semigroupProduct: Semigroup<number> = {
  concat: (x, y) => x * y
}

export const semigroupString: Semigroup<string> = {
  concat: (x, y) => x + y
}

export const semigroupVoid: Semigroup<void> = {
  concat: () => undefined
}

/**
 * You can glue items between and stay associative
 *
 * @example
 * import { getIntercalateSemigroup, semigroupString } from '@matechs/core/Semigroup'
 *
 * const S = getIntercalateSemigroup(' ')(semigroupString)
 *
 * assert.strictEqual(S.concat('a', 'b'), 'a b')
 * assert.strictEqual(S.concat(S.concat('a', 'b'), 'c'), S.concat('a', S.concat('b', 'c')))
 */
export function getIntercalateSemigroup<A>(a: A): (S: Semigroup<A>) => Semigroup<A> {
  return (S) => ({
    concat: (x, y) => S.concat(x, S.concat(a, y))
  })
}
