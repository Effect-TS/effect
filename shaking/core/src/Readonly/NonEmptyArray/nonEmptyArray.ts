/**
 * Data structure which represents non-empty arrays
 */
import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"
import type { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"

import type {
  Alt1,
  Monad1,
  Comonad1,
  TraversableWithIndex1,
  FunctorWithIndex1,
  FoldableWithIndex1,
  Monoid,
  Traverse1,
  Sequence1,
  TraverseWithIndex1
} from "../../Base"
import type { Eq } from "../../Eq"
import type { Predicate, Refinement } from "../../Function"
import { none, Option, some } from "../../Option"
import type { Ord } from "../../Ord"
import { getJoinSemigroup, getMeetSemigroup, Semigroup } from "../../Semigroup"
import type { Show } from "../../Show"
import * as RA from "../Array"
import type { ReadonlyRecord } from "../Record"

export const URI = "@matechs/core/Readonly/NonEmptyArray"

export type URI = typeof URI

declare module "../../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: ReadonlyNonEmptyArray<A>
  }
}

export type { ReadonlyNonEmptyArray }

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from '@matechs/core/Readonly/NonEmptyArray'
 *
 * assert.deepStrictEqual(cons(1, [2, 3, 4]), [1, 2, 3, 4])
 */
export const cons: <A>(head: A, tail: ReadonlyArray<A>) => ReadonlyNonEmptyArray<A> =
  RA.cons

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/Readonly/NonEmptyArray'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc: <A>(init: ReadonlyArray<A>, end: A) => ReadonlyNonEmptyArray<A> =
  RA.snoc

/**
 * Builds a `ReadonlyNonEmptyArray` from an array returning `none` if `as` is an empty array
 */
export function fromReadonlyArray<A>(
  as: ReadonlyArray<A>
): Option<ReadonlyNonEmptyArray<A>> {
  return RA.isNonEmpty(as) ? some(as) : none
}

export function fromArray<A>(as: Array<A>): Option<ReadonlyNonEmptyArray<A>> {
  return fromReadonlyArray(RA.fromArray(as))
}

export const getShow: <A>(S: Show<A>) => Show<ReadonlyNonEmptyArray<A>> = RA.getShow

export function head<A>(nea: ReadonlyNonEmptyArray<A>): A {
  return nea[0]
}

export function tail<A>(nea: ReadonlyNonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(1)
}

export const reverse: <A>(
  nea: ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<A> = RA.reverse as any

export function min<A>(ord: Ord<A>): (nea: ReadonlyNonEmptyArray<A>) => A {
  const S = getMeetSemigroup(ord)
  return (nea) => nea.reduce(S.concat)
}

export function max<A>(ord: Ord<A>): (nea: ReadonlyNonEmptyArray<A>) => A {
  const S = getJoinSemigroup(ord)
  return (nea) => nea.reduce(S.concat)
}

/**
 * Builds a `Semigroup` instance for `ReadonlyNonEmptyArray`
 */
export function getSemigroup<A = never>(): Semigroup<ReadonlyNonEmptyArray<A>> {
  return {
    concat
  }
}

/**
 * @example
 * import { getEq, cons } from '@matechs/core/Readonly/NonEmptyArray'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 2]), true)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 3]), false)
 */
export const getEq: <A>(E: Eq<A>) => Eq<ReadonlyNonEmptyArray<A>> = RA.getEq

/**
 * Group equal, consecutive elements of an array into non empty arrays.
 *
 * @example
 * import { cons, group } from '@matechs/core/Readonly/NonEmptyArray'
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
  (as: ReadonlyNonEmptyArray<A>): ReadonlyNonEmptyArray<ReadonlyNonEmptyArray<A>>
  (as: ReadonlyArray<A>): ReadonlyArray<ReadonlyNonEmptyArray<A>>
}
export function group<A>(
  E: Eq<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyNonEmptyArray<A>> {
  return (as) => {
    const len = as.length
    if (len === 0) {
      return RA.empty
    }
    // tslint:disable-next-line: readonly-array
    const r: Array<ReadonlyNonEmptyArray<A>> = []
    let head: A = as[0]
    let nea: NonEmptyArray<A> = [head]
    for (let i = 1; i < len; i++) {
      const x = as[i]
      if (E.equals(x, head)) {
        nea.push(x)
      } else {
        r.push(nea)
        head = x
        nea = [head]
      }
    }
    r.push(nea)
    return r
  }
}

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @example
 * import { cons, groupSort } from '@matechs/core/Readonly/NonEmptyArray'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(groupSort(ordNumber)([1, 2, 1, 1]), [cons(1, [1, 1]), cons(2, [])])
 */
export function groupSort<A>(
  O: Ord<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyNonEmptyArray<A>> {
  const sortO = RA.sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
}

/**
 * Splits an array into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
 * function on each element, and grouping the results according to values returned
 *
 * @example
 * import { cons, groupBy } from '@matechs/core/Readonly/NonEmptyArray'
 *
 * assert.deepStrictEqual(groupBy((s: string) => String(s.length))(['foo', 'bar', 'foobar']), {
 *   '3': cons('foo', ['bar']),
 *   '6': cons('foobar', [])
 * })
 */
export function groupBy<A>(
  f: (a: A) => string
): (as: ReadonlyArray<A>) => ReadonlyRecord<string, ReadonlyNonEmptyArray<A>> {
  return (as) => {
    const r: Record<string, NonEmptyArray<A>> = {}
    for (const a of as) {
      const k = f(a)
      // eslint-disable-next-line no-prototype-builtins
      if (r.hasOwnProperty(k)) {
        r[k].push(a)
      } else {
        r[k] = [a]
      }
    }
    return r
  }
}

export function last<A>(nea: ReadonlyNonEmptyArray<A>): A {
  return nea[nea.length - 1]
}

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @example
 * import { init } from '@matechs/core/Readonly/NonEmptyArray'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
 * assert.deepStrictEqual(init([1]), [])
 */
export function init<A>(nea: ReadonlyNonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(0, -1)
}

export function sort<A>(
  O: Ord<A>
): (nea: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<A> {
  return RA.sort(O) as any
}

export function insertAt<A>(
  i: number,
  a: A
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return RA.insertAt(i, a) as any
}

export function updateAt<A>(
  i: number,
  a: A
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return RA.updateAt(i, a) as any
}

export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return RA.modifyAt(i, f) as any
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return filterWithIndex((_, a) => predicate(a))
}

export function filterWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return (nea) => fromReadonlyArray(nea.filter((a, i) => predicate(i, a)))
}

export const of: <A>(a: A) => ReadonlyNonEmptyArray<A> = RA.of as any

export function concat<A>(
  fx: ReadonlyArray<A>,
  fy: ReadonlyNonEmptyArray<A>
): ReadonlyNonEmptyArray<A>
export function concat<A>(
  fx: ReadonlyNonEmptyArray<A>,
  fy: ReadonlyArray<A>
): ReadonlyNonEmptyArray<A>
export function concat<A>(
  fx: ReadonlyArray<A>,
  fy: ReadonlyArray<A>
): ReadonlyArray<A> {
  return fx.concat(fy)
}

export function fold<A>(S: Semigroup<A>): (fa: ReadonlyNonEmptyArray<A>) => A {
  return (fa) => fa.reduce(S.concat)
}

export const zipWith: <A, B, C>(
  fa: ReadonlyNonEmptyArray<A>,
  fb: ReadonlyNonEmptyArray<B>,
  f: (a: A, b: B) => C
) => ReadonlyNonEmptyArray<C> = RA.zipWith as any

export const zip: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  fb: ReadonlyNonEmptyArray<B>
) => ReadonlyNonEmptyArray<readonly [A, B]> = RA.zip as any

export const unzip: <A, B>(
  as: ReadonlyNonEmptyArray<readonly [A, B]>
) => readonly [ReadonlyNonEmptyArray<A>, ReadonlyNonEmptyArray<B>] = RA.unzip as any

export const map_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (a: A) => B
) => ReadonlyNonEmptyArray<B> = RA.map_ as any

export const mapWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (i: number, a: A) => B
) => ReadonlyNonEmptyArray<B> = RA.mapWithIndex_ as any

export const ap_: <A, B>(
  fab: ReadonlyNonEmptyArray<(a: A) => B>,
  fa: ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<B> = RA.ap_ as any

export const chain_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (a: A) => ReadonlyNonEmptyArray<B>
) => ReadonlyNonEmptyArray<B> = RA.chain_ as any

export const extend_: <A, B>(
  wa: ReadonlyNonEmptyArray<A>,
  f: (wa: ReadonlyNonEmptyArray<A>) => B
) => ReadonlyNonEmptyArray<B> = RA.extend_ as any

export const reduce_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (b: B, a: A) => B
) => B = RA.reduce_ as any

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: ReadonlyNonEmptyArray<A>, f: (a: A) => M) => M = RA.foldMap_ as any

export const reduceRight_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (a: A, b: B) => B
) => B = RA.reduceRight_ as any

export const traverse_: Traverse1<URI> = RA.traverse_ as any

export const sequence: Sequence1<URI> = RA.sequence as any

export const reduceWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = RA.reduceWithIndex_ as any

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (i: number, a: A) => M
) => M = RA.foldMapWithIndex_ as any

export const reduceRightWithIndex_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = RA.reduceRightWithIndex_ as any

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  number
> = RA.traverseWithIndex_ as any

export const alt_: <A>(
  fx: ReadonlyNonEmptyArray<A>,
  fy: () => ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<A> = (fx, fy) => concat(fx, fy())

export const readonlyNonEmptyArray: Monad1<URI> &
  Comonad1<URI> &
  TraversableWithIndex1<URI, number> &
  FunctorWithIndex1<URI, number> &
  FoldableWithIndex1<URI, number> &
  Alt1<URI> = {
  URI,
  map: map_,
  mapWithIndex: mapWithIndex_,
  of,
  ap: ap_,
  chain: chain_,
  extend: extend_,
  extract: head,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse_,
  sequence,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex: traverseWithIndex_,
  alt: alt_
}

export const ap: <A>(
  fa: ReadonlyNonEmptyArray<A>
) => <B>(
  fab: ReadonlyNonEmptyArray<(a: A) => B>
) => ReadonlyNonEmptyArray<B> = RA.ap as any

export const apFirst: <B>(
  fb: ReadonlyNonEmptyArray<B>
) => <A>(fa: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<A> = RA.apFirst as any

export const apSecond: <B>(
  fb: ReadonlyNonEmptyArray<B>
) => <A>(fa: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<B> = RA.apSecond as any

export const chain: <A, B>(
  f: (a: A) => ReadonlyNonEmptyArray<B>
) => (ma: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<B> = RA.chain as any

export const chainFirst: <A, B>(
  f: (a: A) => ReadonlyNonEmptyArray<B>
) => (ma: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<A> = RA.chainFirst as any

export const duplicate: <A>(
  ma: ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptyArray<ReadonlyNonEmptyArray<A>> = RA.duplicate as any

export const extend: <A, B>(
  f: (fa: ReadonlyNonEmptyArray<A>) => B
) => (ma: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<B> = RA.extend as any

export const flatten: <A>(
  mma: ReadonlyNonEmptyArray<ReadonlyNonEmptyArray<A>>
) => ReadonlyNonEmptyArray<A> = RA.flatten as any

export const map: <A, B>(
  f: (a: A) => B
) => (fa: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<B> = RA.map as any

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<B> = RA.mapWithIndex as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = RA.reduce as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = RA.reduceRight as any

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = RA.reduceRightWithIndex as any

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = RA.reduceWithIndex as any

export const foldMapWithIndex = <S>(S: Semigroup<S>) => <A>(
  f: (i: number, a: A) => S
) => (fa: ReadonlyNonEmptyArray<A>) =>
  fa.slice(1).reduce((s, a, i) => S.concat(s, f(i + 1, a)), f(0, fa[0]))

export const foldMap = <S>(S: Semigroup<S>) => <A>(f: (a: A) => S) => (
  fa: ReadonlyNonEmptyArray<A>
) => fa.slice(1).reduce((s, a) => S.concat(s, f(a)), f(fa[0]))
