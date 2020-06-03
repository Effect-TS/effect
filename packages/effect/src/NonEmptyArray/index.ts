/* adapted from https://github.com/gcanti/fp-ts */

/**
 * Data structure which represents non-empty arrays
 */

import * as AP from "../Apply"
import * as A from "../Array"
import type {
  CAlt1,
  CApplicative1,
  CComonad1,
  CFoldable1,
  CFoldableWithIndex1,
  CFunctorWithIndex1,
  CMonad1,
  CSequence1,
  CTraversableWithIndex1,
  CTraverse1,
  CTraverseWithIndex1,
  Traverse1,
  TraverseWithIndex1,
  Monad1,
  Comonad1,
  TraversableWithIndex1,
  FunctorWithIndex1,
  FoldableWithIndex1,
  Alt1,
  Applicative1
} from "../Base"
import { Do as DoG } from "../Do"
import type { Eq } from "../Eq"
import type { Predicate, Refinement } from "../Function"
import { none, Option, some } from "../Option"
import type { Ord } from "../Ord"
import type { Record } from "../Record"
import { getJoinSemigroup, getMeetSemigroup, Semigroup } from "../Semigroup"
import type { Show } from "../Show"
import { MutableRecord } from "../Support/Types"

export const URI = "@matechs/core/NonEmptyArray"

export type URI = typeof URI

export type NonEmptyArray<A> = A.Array<A> & {
  readonly 0: A
}

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: NonEmptyArray<A>
  }
}

/**
 * Append an element to the front of an array, creating a new non empty array
 *
 * @example
 * import { cons } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(cons(1, [2, 3, 4]), [1, 2, 3, 4])
 */
export const cons_: <A>(tail: A.Array<A>, head: A) => NonEmptyArray<A> = A.cons_

export const cons: <A>(head: A) => (tail: A.Array<A>) => NonEmptyArray<A> = A.cons

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc_: <A>(init: A.Array<A>, end: A) => NonEmptyArray<A> = A.snoc_

export const snoc: <A>(end: A) => (init: A.Array<A>) => NonEmptyArray<A> = A.snoc

/**
 * Builds a `ReadonlyNonEmptyArray` from an array returning `none` if `as` is an empty array
 */
export function fromArray<A>(as: A.Array<A>): Option<NonEmptyArray<A>> {
  return A.isNonEmpty(as) ? some(as) : none
}

export const getShow: <A>(S: Show<A>) => Show<NonEmptyArray<A>> = A.getShow

export function head<A>(nea: NonEmptyArray<A>): A {
  return nea[0]
}

export function tail<A>(nea: NonEmptyArray<A>): A.Array<A> {
  return nea.slice(1)
}

export const reverse: <A>(nea: NonEmptyArray<A>) => NonEmptyArray<A> = A.reverse as any

export function min<A>(ord: Ord<A>): (nea: NonEmptyArray<A>) => A {
  const S = getMeetSemigroup(ord)
  return (nea) => nea.reduce(S.concat)
}

export function min_<A>(nea: NonEmptyArray<A>, ord: Ord<A>): A {
  const S = getMeetSemigroup(ord)
  return nea.reduce(S.concat)
}

export function max<A>(ord: Ord<A>): (nea: NonEmptyArray<A>) => A {
  const S = getJoinSemigroup(ord)
  return (nea) => nea.reduce(S.concat)
}

export function max_<A>(nea: NonEmptyArray<A>, ord: Ord<A>): A {
  const S = getJoinSemigroup(ord)
  return nea.reduce(S.concat)
}

/**
 * Builds a `Semigroup` instance for `ReadonlyNonEmptyArray`
 */
export function getSemigroup<A = never>(): Semigroup<NonEmptyArray<A>> {
  return {
    concat: concat_
  }
}

/**
 * @example
 * import { getEq, cons } from '@matechs/core/NonEmptyArray'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 2]), true)
 * assert.strictEqual(E.equals(cons(1, [2]), [1, 3]), false)
 */
export const getEq: <A>(E: Eq<A>) => Eq<NonEmptyArray<A>> = A.getEq

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
  (as: A.Array<A>): A.Array<NonEmptyArray<A>>
}
export function group<A>(E: Eq<A>): (as: A.Array<A>) => A.Array<NonEmptyArray<A>> {
  return (as) => {
    const len = as.length
    if (len === 0) {
      return A.empty
    }
    // tslint:disable-next-line: readonly-array
    const r: Array<NonEmptyArray<A>> = []
    let head: A = as[0]
    let nea: Array<A> & { 0: A } = [head]
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

export function group_<A>(as: A.Array<A>, E: Eq<A>): A.Array<NonEmptyArray<A>>
export function group_<A>(
  as: NonEmptyArray<A>,
  E: Eq<A>
): NonEmptyArray<NonEmptyArray<A>>
export function group_<A>(as: A.Array<A>, E: Eq<A>): A.Array<NonEmptyArray<A>> {
  const len = as.length
  if (len === 0) {
    return A.empty
  }
  // tslint:disable-next-line: readonly-array
  const r: Array<NonEmptyArray<A>> = []
  let head: A = as[0]
  let nea: Array<A> & { 0: A } = [head]
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

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @example
 * import { cons, groupSort } from '@matechs/core/NonEmptyArray'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * assert.deepStrictEqual(groupSort(ordNumber)([1, 2, 1, 1]), [cons(1, [1, 1]), cons(2, [])])
 */
export function groupSort<A>(O: Ord<A>): (as: A.Array<A>) => A.Array<NonEmptyArray<A>> {
  const sortO = A.sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
}

export function groupSort_<A>(as: A.Array<A>, O: Ord<A>): A.Array<NonEmptyArray<A>> {
  const sortO = A.sort(O)
  const groupO = group(O)
  return groupO(sortO(as))
}

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
export function groupBy<A>(
  f: (a: A) => string
): (as: A.Array<A>) => Record<string, NonEmptyArray<A>> {
  return (as) => {
    const r: MutableRecord<string, Array<A> & { 0: A }> = {}
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

export function groupBy_<A>(
  as: A.Array<A>,
  f: (a: A) => string
): Record<string, NonEmptyArray<A>> {
  const r: MutableRecord<string, Array<A> & { 0: A }> = {}
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

export function last<A>(nea: NonEmptyArray<A>): A {
  return nea[nea.length - 1]
}

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @example
 * import { init } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
 * assert.deepStrictEqual(init([1]), [])
 */
export function init<A>(nea: NonEmptyArray<A>): A.Array<A> {
  return nea.slice(0, -1)
}

export function sort<A>(O: Ord<A>): (nea: NonEmptyArray<A>) => NonEmptyArray<A> {
  return A.sort(O) as any
}

export function sort_<A>(nea: NonEmptyArray<A>, O: Ord<A>): NonEmptyArray<A> {
  return A.sort_(nea, O) as any
}

export function insertAt<A>(
  i: number,
  a: A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return A.insertAt(i, a) as any
}

export function insertAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  a: A
): Option<NonEmptyArray<A>> {
  return A.insertAt_(nea, i, a) as any
}

export function updateAt<A>(
  i: number,
  a: A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return A.updateAt(i, a) as any
}

export function updateAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  a: A
): Option<NonEmptyArray<A>> {
  return A.updateAt_(nea, i, a) as any
}

export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return A.modifyAt(i, f) as any
}

export function modifyAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  f: (a: A) => A
): Option<NonEmptyArray<A>> {
  return A.modifyAt_(nea, i, f) as any
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
  return filterWithIndex((_, a) => predicate(a))
}

export function filter_<A, B extends A>(
  nea: NonEmptyArray<A>,
  refinement: Refinement<A, B>
): Option<NonEmptyArray<A>>
export function filter_<A>(
  nea: NonEmptyArray<A>,
  predicate: Predicate<A>
): Option<NonEmptyArray<A>>
export function filter_<A>(
  nea: NonEmptyArray<A>,
  predicate: Predicate<A>
): Option<NonEmptyArray<A>> {
  return filterWithIndex_(nea, (_, a) => predicate(a))
}

export function filterWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return (nea) => fromArray(nea.filter((a, i) => predicate(i, a)))
}

export function filterWithIndex_<A>(
  nea: NonEmptyArray<A>,
  predicate: (i: number, a: A) => boolean
): Option<NonEmptyArray<A>> {
  return fromArray(nea.filter((a, i) => predicate(i, a)))
}

export const of: <A>(a: A) => NonEmptyArray<A> = A.of as any

export function concat_<A>(fx: A.Array<A>, fy: NonEmptyArray<A>): NonEmptyArray<A>
export function concat_<A>(fx: NonEmptyArray<A>, fy: A.Array<A>): NonEmptyArray<A>
export function concat_<A>(fx: A.Array<A>, fy: A.Array<A>): A.Array<A> {
  return fx.concat(fy)
}

export function concat<A>(fy: NonEmptyArray<A>): (fx: A.Array<A>) => NonEmptyArray<A>
export function concat<A>(fy: A.Array<A>): (fx: A.Array<A>) => NonEmptyArray<A>
export function concat<A>(fy: A.Array<A>): (fx: A.Array<A>) => A.Array<A> {
  return (fx) => fx.concat(fy)
}

export function fold<A>(S: Semigroup<A>): (fa: NonEmptyArray<A>) => A {
  return (fa) => fa.reduce(S.concat)
}

export const zipWith_: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = A.zipWith_ as any

export const zipWith: <A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = A.zipWith as any

export const zip_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<readonly [A, B]> = A.zip_ as any

export const zip: <A, B>(
  fb: NonEmptyArray<B>
) => (fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = A.zip as any

export const unzip: <A, B>(
  as: NonEmptyArray<readonly [A, B]>
) => readonly [NonEmptyArray<A>, NonEmptyArray<B>] = A.unzip as any

export const traverse: CTraverse1<URI> = A.traverse as any

export const traverse_: Traverse1<URI> = A.traverse_ as any

export const sequence: CSequence1<URI> = A.sequence as any

export const traverseWithIndex: CTraverseWithIndex1<
  URI,
  number
> = A.traverseWithIndex as any

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  number
> = A.traverseWithIndex as any

export const alt: <A>(
  fy: () => NonEmptyArray<A>
) => (fx: NonEmptyArray<A>) => NonEmptyArray<A> = (fy) => (fx) => concat_(fx, fy())

export const alt_: <A>(
  fx: NonEmptyArray<A>,
  fy: () => NonEmptyArray<A>
) => NonEmptyArray<A> = (fx, fy) => concat_(fx, fy())

export const ap: <A>(
  fa: NonEmptyArray<A>
) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = A.ap as any

export const ap_: <A, B>(
  fab: NonEmptyArray<(a: A) => B>,
  fa: NonEmptyArray<A>
) => NonEmptyArray<B> = A.ap_ as any

export const apFirst: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.apFirst as any

export const apFirst_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<A> = A.apFirst_ as any

export const apSecond: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.apSecond as any

export const apSecond_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<B> = A.apSecond_ as any

export const chain: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.chain as any

export const chain_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = A.chain_ as any

export const chainTap: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<A> = A.chainTap as any

export const chainTap_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<A> = A.chainTap_ as any

export const duplicate: <A>(
  ma: NonEmptyArray<A>
) => NonEmptyArray<NonEmptyArray<A>> = A.duplicate as any

export const extend: <A, B>(
  f: (fa: NonEmptyArray<A>) => B
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.extend as any

export const extend_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (fa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = A.extend_ as any

export const flatten: <A>(
  mma: NonEmptyArray<NonEmptyArray<A>>
) => NonEmptyArray<A> = A.flatten as any

export const map: <A, B>(
  f: (a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.map as any

export const map_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (a: A) => B
) => NonEmptyArray<B> = A.map_ as any

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.mapWithIndex as any

export const mapWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (i: number, a: A) => B
) => NonEmptyArray<B> = A.mapWithIndex_ as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = A.reduce as any

export const reduce_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (b: B, a: A) => B
) => B = A.reduce_ as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = A.reduceRight as any

export const reduceRight_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (a: A, b: B) => B
) => B = A.reduceRight_ as any

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = A.reduceRightWithIndex as any

export const reduceRightWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = A.reduceRightWithIndex_ as any

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = A.reduceWithIndex as any

export const reduceWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = A.reduceWithIndex_ as any

export const foldMapWithIndex = <S>(S: Semigroup<S>) => <A>(
  f: (i: number, a: A) => S
) => (fa: NonEmptyArray<A>) =>
  fa.slice(1).reduce((s, a, i) => S.concat(s, f(i + 1, a)), f(0, fa[0]))

export const foldMapWithIndex_ = <S>(S: Semigroup<S>) => <A>(
  fa: NonEmptyArray<A>,
  f: (i: number, a: A) => S
) => fa.slice(1).reduce((s, a, i) => S.concat(s, f(i + 1, a)), f(0, fa[0]))

export const foldMap = <S>(S: Semigroup<S>) => <A>(f: (a: A) => S) => (
  fa: NonEmptyArray<A>
) => fa.slice(1).reduce((s, a) => S.concat(s, f(a)), f(fa[0]))

export const foldMap_ = <S>(S: Semigroup<S>) => <A>(
  fa: NonEmptyArray<A>,
  f: (a: A) => S
) => fa.slice(1).reduce((s, a) => S.concat(s, f(a)), f(fa[0]))

export const foldableNonEmptyArray: CFoldable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight
}

export const nonEmptyArray: CMonad1<URI> &
  CComonad1<URI> &
  CTraversableWithIndex1<URI, number> &
  CFunctorWithIndex1<URI, number> &
  CFoldableWithIndex1<URI, number> &
  CAlt1<URI> &
  CApplicative1<URI> = {
  URI,
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

export const monadNonEmptyArray: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain
}

export const applicativeNonEmptyArray: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of,
  ap,
  chain
}

export const Do = () => DoG(monadNonEmptyArray)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(applicativeNonEmptyArray))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(applicativeNonEmptyArray))()

//
// Compatibility with fp-ts ecosystem
//

export const nonEmptyArray_: Monad1<URI> &
  Comonad1<URI> &
  TraversableWithIndex1<URI, number> &
  FunctorWithIndex1<URI, number> &
  FoldableWithIndex1<URI, number> &
  Alt1<URI> &
  Applicative1<URI> =
  /*#__PURE__*/
  (() =>
    ({
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
      traverse: A.array_.traverse as any,
      sequence: A.array_.sequence as any,
      reduceWithIndex: reduceWithIndex_,
      foldMapWithIndex: foldMapWithIndex_,
      reduceRightWithIndex: reduceRightWithIndex_,
      traverseWithIndex: A.array_.traverseWithIndex as any,
      alt: alt_
    } as const))()
