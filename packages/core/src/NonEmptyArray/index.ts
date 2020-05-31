/* adapted from https://github.com/gcanti/fp-ts */

/**
 * Data structure which represents non-empty arrays
 */

import * as AP from "../Apply"
import * as RA from "../Array"
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
import type { ReadonlyRecord } from "../Readonly/Record"
import { getJoinSemigroup, getMeetSemigroup, Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export const URI = "@matechs/core/NonEmptyArray"

export type URI = typeof URI

export type NonEmptyArray<A> = ReadonlyArray<A> & {
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
export const cons_: <A>(tail: ReadonlyArray<A>, head: A) => NonEmptyArray<A> = RA.cons_

export const cons: <A>(head: A) => (tail: ReadonlyArray<A>) => NonEmptyArray<A> =
  RA.cons

/**
 * Append an element to the end of an array, creating a new non empty array
 *
 * @example
 * import { snoc } from '@matechs/core/NonEmptyArray'
 *
 * assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
 */
export const snoc_: <A>(init: ReadonlyArray<A>, end: A) => NonEmptyArray<A> = RA.snoc_

export const snoc: <A>(end: A) => (init: ReadonlyArray<A>) => NonEmptyArray<A> = RA.snoc

/**
 * Builds a `ReadonlyNonEmptyArray` from an array returning `none` if `as` is an empty array
 */
export function fromReadonlyArray<A>(as: ReadonlyArray<A>): Option<NonEmptyArray<A>> {
  return RA.isNonEmpty(as) ? some(as) : none
}

export function fromArray<A>(as: Array<A>): Option<NonEmptyArray<A>> {
  return fromReadonlyArray(RA.fromArray(as))
}

export const getShow: <A>(S: Show<A>) => Show<NonEmptyArray<A>> = RA.getShow

export function head<A>(nea: NonEmptyArray<A>): A {
  return nea[0]
}

export function tail<A>(nea: NonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(1)
}

export const reverse: <A>(nea: NonEmptyArray<A>) => NonEmptyArray<A> = RA.reverse as any

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
    concat
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
export const getEq: <A>(E: Eq<A>) => Eq<NonEmptyArray<A>> = RA.getEq

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
  (as: ReadonlyArray<A>): ReadonlyArray<NonEmptyArray<A>>
}
export function group<A>(
  E: Eq<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
  return (as) => {
    const len = as.length
    if (len === 0) {
      return RA.empty
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

export function group_<A>(
  as: ReadonlyArray<A>,
  E: Eq<A>
): ReadonlyArray<NonEmptyArray<A>>
export function group_<A>(
  as: NonEmptyArray<A>,
  E: Eq<A>
): NonEmptyArray<NonEmptyArray<A>>
export function group_<A>(
  as: ReadonlyArray<A>,
  E: Eq<A>
): ReadonlyArray<NonEmptyArray<A>> {
  const len = as.length
  if (len === 0) {
    return RA.empty
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
export function groupSort<A>(
  O: Ord<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<NonEmptyArray<A>> {
  const sortO = RA.sort(O)
  const groupO = group(O)
  return (as) => groupO(sortO(as))
}

export function groupSort_<A>(
  as: ReadonlyArray<A>,
  O: Ord<A>
): ReadonlyArray<NonEmptyArray<A>> {
  const sortO = RA.sort(O)
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
): (as: ReadonlyArray<A>) => ReadonlyRecord<string, NonEmptyArray<A>> {
  return (as) => {
    const r: Record<string, Array<A> & { 0: A }> = {}
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
  as: ReadonlyArray<A>,
  f: (a: A) => string
): ReadonlyRecord<string, NonEmptyArray<A>> {
  const r: Record<string, Array<A> & { 0: A }> = {}
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
export function init<A>(nea: NonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(0, -1)
}

export function sort<A>(O: Ord<A>): (nea: NonEmptyArray<A>) => NonEmptyArray<A> {
  return RA.sort(O) as any
}

export function sort_<A>(nea: NonEmptyArray<A>, O: Ord<A>): NonEmptyArray<A> {
  return RA.sort_(nea, O) as any
}

export function insertAt<A>(
  i: number,
  a: A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return RA.insertAt(i, a) as any
}

export function insertAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  a: A
): Option<NonEmptyArray<A>> {
  return RA.insertAt_(nea, i, a) as any
}

export function updateAt<A>(
  i: number,
  a: A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return RA.updateAt(i, a) as any
}

export function updateAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  a: A
): Option<NonEmptyArray<A>> {
  return RA.updateAt_(nea, i, a) as any
}

export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return RA.modifyAt(i, f) as any
}

export function modifyAt_<A>(
  nea: NonEmptyArray<A>,
  i: number,
  f: (a: A) => A
): Option<NonEmptyArray<A>> {
  return RA.modifyAt_(nea, i, f) as any
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
  return (nea) => fromReadonlyArray(nea.filter((a, i) => predicate(i, a)))
}

export function filterWithIndex_<A>(
  nea: NonEmptyArray<A>,
  predicate: (i: number, a: A) => boolean
): Option<NonEmptyArray<A>> {
  return fromReadonlyArray(nea.filter((a, i) => predicate(i, a)))
}

export const of: <A>(a: A) => NonEmptyArray<A> = RA.of as any

export function concat<A>(fx: ReadonlyArray<A>, fy: NonEmptyArray<A>): NonEmptyArray<A>
export function concat<A>(fx: NonEmptyArray<A>, fy: ReadonlyArray<A>): NonEmptyArray<A>
export function concat<A>(
  fx: ReadonlyArray<A>,
  fy: ReadonlyArray<A>
): ReadonlyArray<A> {
  return fx.concat(fy)
}

export function concat_<A>(
  fy: NonEmptyArray<A>
): (fx: ReadonlyArray<A>) => NonEmptyArray<A>
export function concat_<A>(
  fy: ReadonlyArray<A>
): (fx: ReadonlyArray<A>) => NonEmptyArray<A>
export function concat_<A>(
  fy: ReadonlyArray<A>
): (fx: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (fx) => fx.concat(fy)
}

export function fold<A>(S: Semigroup<A>): (fa: NonEmptyArray<A>) => A {
  return (fa) => fa.reduce(S.concat)
}

export const zipWith_: <A, B, C>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => NonEmptyArray<C> = RA.zipWith_ as any

export const zipWith: <A, B, C>(
  fb: NonEmptyArray<B>,
  f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = RA.zipWith as any

export const zip_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<readonly [A, B]> = RA.zip_ as any

export const zip: <A, B>(
  fb: NonEmptyArray<B>
) => (fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = RA.zip as any

export const unzip: <A, B>(
  as: NonEmptyArray<readonly [A, B]>
) => readonly [NonEmptyArray<A>, NonEmptyArray<B>] = RA.unzip as any

export const traverse: CTraverse1<URI> = RA.traverse as any

export const traverse_: Traverse1<URI> = RA.traverse_ as any

export const sequence: CSequence1<URI> = RA.sequence as any

export const traverseWithIndex: CTraverseWithIndex1<
  URI,
  number
> = RA.traverseWithIndex as any

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  number
> = RA.traverseWithIndex as any

export const alt: <A>(
  fy: () => NonEmptyArray<A>
) => (fx: NonEmptyArray<A>) => NonEmptyArray<A> = (fy) => (fx) => concat(fx, fy())

export const alt_: <A>(
  fx: NonEmptyArray<A>,
  fy: () => NonEmptyArray<A>
) => NonEmptyArray<A> = (fx, fy) => concat(fx, fy())

export const ap: <A>(
  fa: NonEmptyArray<A>
) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = RA.ap as any

export const ap_: <A, B>(
  fab: NonEmptyArray<(a: A) => B>,
  fa: NonEmptyArray<A>
) => NonEmptyArray<B> = RA.ap_ as any

export const apFirst: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = RA.apFirst as any

export const apFirst_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<A> = RA.apFirst_ as any

export const apSecond: <B>(
  fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = RA.apSecond as any

export const apSecond_: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<B> = RA.apSecond_ as any

export const chain: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = RA.chain as any

export const chain_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = RA.chain_ as any

export const chainTap: <A, B>(
  f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<A> = RA.chainTap as any

export const chainTap_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (a: A) => NonEmptyArray<B>
) => NonEmptyArray<A> = RA.chainTap_ as any

export const duplicate: <A>(
  ma: NonEmptyArray<A>
) => NonEmptyArray<NonEmptyArray<A>> = RA.duplicate as any

export const extend: <A, B>(
  f: (fa: NonEmptyArray<A>) => B
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = RA.extend as any

export const extend_: <A, B>(
  ma: NonEmptyArray<A>,
  f: (fa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = RA.extend_ as any

export const flatten: <A>(
  mma: NonEmptyArray<NonEmptyArray<A>>
) => NonEmptyArray<A> = RA.flatten as any

export const map: <A, B>(
  f: (a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = RA.map as any

export const map_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (a: A) => B
) => NonEmptyArray<B> = RA.map_ as any

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = RA.mapWithIndex as any

export const mapWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  f: (i: number, a: A) => B
) => NonEmptyArray<B> = RA.mapWithIndex_ as any

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = RA.reduce as any

export const reduce_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (b: B, a: A) => B
) => B = RA.reduce_ as any

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = RA.reduceRight as any

export const reduceRight_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (a: A, b: B) => B
) => B = RA.reduceRight_ as any

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = RA.reduceRightWithIndex as any

export const reduceRightWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = RA.reduceRightWithIndex_ as any

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = RA.reduceWithIndex as any

export const reduceWithIndex_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = RA.reduceWithIndex_ as any

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
      traverse: RA.array_.traverse as any,
      sequence: RA.array_.sequence as any,
      reduceWithIndex: reduceWithIndex_,
      foldMapWithIndex: foldMapWithIndex_,
      reduceRightWithIndex: reduceRightWithIndex_,
      traverseWithIndex: RA.array_.traverseWithIndex as any,
      alt: alt_
    } as const))()
