/* adapted from https://github.com/gcanti/fp-ts */

/**
 * Data structure which represents non-empty arrays
 */
import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"

import type {
  CTraverse1,
  CSequence1,
  CTraverseWithIndex1,
  CMonad1,
  CComonad1,
  CTraversableWithIndex1,
  CFunctorWithIndex1,
  CFoldableWithIndex1,
  CAlt1,
  CApplicative1
} from "../Base"
import type { Eq } from "../Eq"
import type { Predicate, Refinement } from "../Function"
import type { Option } from "../Option"
import type { Ord } from "../Ord"
import * as RNEA from "../Readonly/NonEmptyArray"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export const URI = "@matechs/core/NonEmptyArray"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: NonEmptyArray<A>
  }
}

export type { NonEmptyArray }

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(cons(1, [2, 3, 4]), [1, 2, 3, 4])
 */
export const cons: <A>(head: A, tail: Array<A>) => NonEmptyArray<A> = RNEA.cons as any

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc: <A>(init: Array<A>, end: A) => NonEmptyArray<A> = RNEA.snoc as any

/**
 * Builds a `NonEmptyArray` from an `Array` returning `none` if `as` is an empty array
 */
export const fromArray: <A>(
  as: Array<A>
) => Option<NonEmptyArray<A>> = RNEA.fromArray as any

export const getShow: <A>(S: Show<A>) => Show<NonEmptyArray<A>> = RNEA.getShow

export const head: <A>(nea: NonEmptyArray<A>) => A = RNEA.head

export const tail: <A>(nea: NonEmptyArray<A>) => Array<A> = RNEA.tail as any

export const reverse: <A>(
  nea: NonEmptyArray<A>
) => NonEmptyArray<A> = RNEA.reverse as any

export const min: <A>(ord: Ord<A>) => (nea: NonEmptyArray<A>) => A = RNEA.min

export const max: <A>(ord: Ord<A>) => (nea: NonEmptyArray<A>) => A = RNEA.max

/**
 * Builds a `Semigroup` instance for `NonEmptyArray`
 */
export const getSemigroup: <A = never>() => Semigroup<
  NonEmptyArray<A>
> = RNEA.getSemigroup as any

/**
 * @example
 * import { getEq, cons } from '@matechs/core/NonEmptyArray'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 2]), true)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 3]), false)
 */
export const getEq: <A>(E: Eq<A>) => Eq<NonEmptyArray<A>> = RNEA.getEq

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @example
 * import { cons, group } from '@matechs/core/NonEmptyArray'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(group(ordNumber)([1, 2, 1, 1]), [
 *   cons(1, []),
 *   cons(2, []),
 *   cons(1, [1])
 * ])
 */
export function group<A>(
  E: Eq<A>
): {
  (as: NonEmptyArray<A>): NonEmptyArray<NonEmptyArray<A>>
  (as: Array<A>): Array<NonEmptyArray<A>>
}
export function group<A>(E: Eq<A>): (as: Array<A>) => Array<NonEmptyArray<A>> {
  return RNEA.group(E) as any
}

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @example
 * import { cons, groupSort } from '@matechs/core/NonEmptyArray'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(groupSort(ordNumber)([1, 2, 1, 1]), [cons(1, [1, 1]), cons(2, [])])
 */
export const groupSort: <A>(
  O: Ord<A>
) => (as: Array<A>) => Array<NonEmptyArray<A>> = RNEA.groupSort as any

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @example
 * import { cons, groupBy } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(groupBy((s: string) => String(s.length))(['foo', 'bar', 'foobar']), {
 *   '3': cons('foo', ['bar']),
 *   '6': cons('foobar', [])
 * })
 */
export const groupBy: <A>(
  f: (a: A) => string
) => (as: Array<A>) => Record<string, NonEmptyArray<A>> = RNEA.groupBy as any

export const last: <A>(nea: NonEmptyArray<A>) => A = RNEA.last

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @example
 * import { init } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
 * assert.deepStrictEqual(init([1]), [])
 */
export const init: <A>(nea: NonEmptyArray<A>) => Array<A> = RNEA.init as any

export const sort: <A>(
  O: Ord<A>
) => (nea: NonEmptyArray<A>) => NonEmptyArray<A> = RNEA.sort as any

export const insertAt: <A>(
  i: number,
  a: A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = RNEA.insertAt as any

export const updateAt: <A>(
  i: number,
  a: A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = RNEA.updateAt as any

export const modifyAt: <A>(
  i: number,
  f: (a: A) => A
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = RNEA.modifyAt as any

export function copy<A>(nea: NonEmptyArray<A>): NonEmptyArray<A> {
  const l = nea.length
  const as = Array(l)
  for (let i = 0; i < l; i++) {
    as[i] = nea[i]
  }
  return as as any
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return RNEA.filter(predicate) as any
}

export const filterWithIndex: <A>(
  predicate: (i: number, a: A) => boolean
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = RNEA.filterWithIndex as any

export const of: <A>(a: A) => NonEmptyArray<A> = RNEA.of as any

export function concat<A>(fx: Array<A>, fy: NonEmptyArray<A>): NonEmptyArray<A>
export function concat<A>(fx: NonEmptyArray<A>, fy: Array<A>): NonEmptyArray<A>
export function concat<A>(fx: Array<A>, fy: Array<A>): Array<A> {
  return RNEA.concat(fx as any, fy as any) as any
}

export const fold: <A>(S: Semigroup<A>) => (fa: NonEmptyArray<A>) => A = RNEA.fold

export const zipWith: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = RNEA.zipWith as any

export const zip: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<[A, B]> = RNEA.zip as any

export const unzip: <A, B>(
  as: NonEmptyArray<[A, B]>
) => [NonEmptyArray<A>, NonEmptyArray<B>] = RNEA.unzip as any

export const traverse: CTraverse1<URI> = RNEA.traverse as any

export const sequence: CSequence1<URI> = RNEA.sequence as any

export const traverseWithIndex: CTraverseWithIndex1<
  URI,
  number
> = RNEA.traverseWithIndex as any

export const ap: <A>(
  fa: NonEmptyArray<A>
) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = RNEA.ap as any

export const apFirst: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = RNEA.apFirst as any

export const apSecond: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = RNEA.apSecond as any

export const chain: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = RNEA.chain as any

export const chainFirst: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<A> = RNEA.chainFirst as any

export const duplicate: <A>(
  ma: NonEmptyArray<A>
) => NonEmptyArray<NonEmptyArray<A>> = RNEA.duplicate as any

export const extend: <A, B>(
  f: (fa: NonEmptyArray<A>) => B
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = RNEA.extend as any

export const flatten: <A>(
  mma: NonEmptyArray<NonEmptyArray<A>>
) => NonEmptyArray<A> = RNEA.flatten as any

export const map: <A, B>(
  f: (a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = RNEA.map as any

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = RNEA.mapWithIndex as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = RNEA.reduce as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = RNEA.reduceRight as any

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = RNEA.reduceRightWithIndex as any

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = RNEA.reduceWithIndex as any

export const foldMapWithIndex: <S>(
  S: Semigroup<S>
) => <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S =
  RNEA.foldMapWithIndex

export const foldMap: <S>(
  S: Semigroup<S>
) => <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>) => S = RNEA.foldMap

export const alt: <A>(
  fy: () => NonEmptyArray<A>
) => (fx: NonEmptyArray<A>) => NonEmptyArray<A> = (fy) => (fx) => concat(fx, fy())

export const nonEmptyArray: CMonad1<URI> &
  CComonad1<URI> &
  CTraversableWithIndex1<URI, number> &
  CFunctorWithIndex1<URI, number> &
  CFoldableWithIndex1<URI, number> &
  CAlt1<URI> &
  CApplicative1<URI> = {
  URI,
  _F: "curried",
  map,
  mapWithIndex,
  of,
  ap,
  chain,
  extend,
  extract: head,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  reduceWithIndex,
  foldMapWithIndex,
  reduceRightWithIndex,
  traverseWithIndex,
  alt
}
