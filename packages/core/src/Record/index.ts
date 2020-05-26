/* adapted from https:/github.com/gcanti/fp-ts */

import type {
  CApplicative,
  CApplicative1,
  CApplicative2,
  CApplicative2C,
  CApplicative3,
  CApplicative3C,
  CApplicative4,
  CApplicative4MA,
  CApplicative4MAC,
  CApplicative4MAP,
  CApplicative4MAPC,
  CCompactable1,
  CFilterableWithIndex1,
  CFoldable,
  CFoldable1,
  CFoldable2,
  CFoldable3,
  CFoldableWithIndex1,
  CFunctorWithIndex1,
  CTraversableWithIndex1,
  CUnfoldable,
  CUnfoldable1,
  CWitherable1,
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  MaURIS,
  PredicateWithIndex,
  RefinementWithIndex,
  Separated,
  URIS,
  URIS2,
  URIS3,
  URIS4
} from "../Base"
import type { Either } from "../Either"
import { Eq } from "../Eq"
import { Predicate, Refinement } from "../Function"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import { Option } from "../Option"
import * as RR from "../Readonly/Record"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export const URI = "../../Record"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Record<string, A>
  }
}

export const getShow: {
  <A>(S: Show<A>): Show<Record<string, A>>
} = RR.getShow as any

/**
 * Calculate the number of key/value pairs in a record
 */
export const size: {
  (r: Record<string, unknown>): number
} = RR.size as any

/**
 * Test whether a record is empty
 */
export const isEmpty: { (r: Record<string, unknown>): boolean } = RR.isEmpty

export const keys: {
  <K extends string>(r: Record<K, unknown>): Array<K>
} = RR.keys as any

/**
 * Map a record into an array
 *
 * @example
 * import {collect} from '@matechs/core/Record'
 *
 * const x: { a: string, b: boolean } = { a: 'foo', b: false }
 * assert.deepStrictEqual(
 *   collect((key, val) => ({key: key, value: val}))(x),
 *   [{key: 'a', value: 'foo'}, {key: 'b', value: false}]
 * )
 */
export const collect: {
  <K extends string, A, B>(f: (k: K, a: A) => B): (r: Record<K, A>) => Array<B>
} = RR.collect as any

export const collect_: {
  <K extends string, A, B>(r: Record<K, A>, f: (k: K, a: A) => B): Array<B>
} = RR.collect_ as any

/**
 * Insert or replace a key/value pair in a record
 */
export const insertAt: {
  <K extends string, A>(k: K, a: A): <KS extends string>(
    r: Record<KS, A>
  ) => Record<KS | K, A>
  <A>(k: string, a: A): (r: Record<string, A>) => Record<string, A>
} = RR.insertAt

export const insertAt_: {
  <KS extends string, K extends string, A>(r: Record<KS, A>, k: K, a: A): Record<
    KS | K,
    A
  >
  <A>(r: Record<string, A>, k: string, a: A): Record<string, A>
} = RR.insertAt_

export function hasOwnProperty<K extends string>(
  k: string,
  r: Record<K, unknown>
): k is K {
  return Object.prototype.hasOwnProperty.call(r, k)
}

/**
 * Delete a key and value from a map
 */
export const deleteAt: {
  <K extends string>(k: K): <KS extends string, A>(
    r: Record<KS, A>
  ) => Record<string extends K ? string : Exclude<KS, K>, A>
  (k: string): <A>(r: Record<string, A>) => Record<string, A>
} = RR.deleteAt as any

export const deleteAt_: {
  <KS extends string, A, K extends string>(r: Record<KS, A>, k: K): Record<
    string extends K ? string : Exclude<KS, K>,
    A
  >
  <A>(r: Record<string, A>, k: string): Record<string, A>
} = RR.deleteAt_ as any

export const updateAt: {
  <A>(k: string, a: A): <K extends string>(r: Record<K, A>) => Option<Record<K, A>>
} = RR.updateAt

export const updateAt_: {
  <K extends string, A>(r: Record<K, A>, k: string, a: A): Option<Record<K, A>>
} = RR.updateAt_ as any

export const modifyAt: {
  <A>(k: string, f: (a: A) => A): <K extends string>(
    r: Record<K, A>
  ) => Option<Record<K, A>>
} = RR.modifyAt as any

export const modifyAt_: {
  <K extends string, A>(r: Record<K, A>, k: string, f: (a: A) => A): Option<
    Record<K, A>
  >
} = RR.modifyAt_ as any

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export const pop: {
  <K extends string>(k: K): <KS extends string, A>(
    r: Record<KS, A>
  ) => Option<[A, Record<string extends K ? string : Exclude<KS, K>, A>]>
  (k: string): <A>(r: Record<string, A>) => Option<[A, Record<string, A>]>
} = RR.pop as any

export const pop_: {
  <KS extends string, A, K extends string>(r: Record<KS, A>, k: K): Option<
    [A, Record<string extends K ? string : Exclude<KS, K>, A>]
  >
  <A>(r: Record<string, A>, k: string): Option<[A, Record<string, A>]>
} = RR.pop_ as any

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export const isSubrecord_: {
  <A>(E: Eq<A>): (x: Record<string, A>, y: Record<string, A>) => boolean
} = RR.isSubrecord_

export const isSubrecord: {
  <A>(E: Eq<A>): (y: Record<string, A>) => (x: Record<string, A>) => boolean
} = RR.isSubrecord

export const getEq: {
  <K extends string, A>(E: Eq<A>): Eq<Record<K, A>>
  <A>(E: Eq<A>): Eq<Record<string, A>>
} = RR.getEq as any

/**
 * Returns a `Semigroup` instance for records given a `Semigroup` instance for their values
 *
 * @example
 * import { semigroupSum } from '@matechs/core/Semigroup'
 * import { getMonoid } from '@matechs/core/Record'
 *
 * const M = getMonoid(semigroupSum)
 * assert.deepStrictEqual(M.concat({ foo: 123 }, { foo: 456 }), { foo: 579 })
 */
export const getMonoid: {
  <K extends string, A>(S: Semigroup<A>): Monoid<Record<K, A>>
  <A>(S: Semigroup<A>): Monoid<Record<string, A>>
} = RR.getMonoid

/**
 * Lookup the value for a key in a record
 */
export const lookup_: {
  <A>(r: Record<string, A>, k: string): Option<A>
} = RR.lookup_

export const lookup: {
  (k: string): <A>(r: Record<string, A>) => Option<A>
} = RR.lookup

export const empty: Record<string, never> = {}

/**
 * Map a record passing the keys to the iterating function
 */
export const mapWithIndex: {
  <K extends string, A, B>(f: (k: K, a: A) => B): (fa: Record<K, A>) => Record<K, B>
  <A, B>(f: (k: string, a: A) => B): (fa: Record<string, A>) => Record<string, B>
} = RR.mapWithIndex

/**
 * Map a record passing the values to the iterating function
 */
export const map: {
  <A, B>(f: (a: A) => B): <K extends string>(fa: Record<K, A>) => Record<K, B>
  <A, B>(f: (a: A) => B): (fa: Record<string, A>) => Record<string, B>
} = RR.map

export const map_: {
  <K extends string, A, B>(fa: Record<K, A>, f: (a: A) => B): Record<K, B>
  <A, B>(fa: Record<string, A>, f: (a: A) => B): Record<string, B>
} = RR.map_

export const reduceWithIndex: {
  <K extends string, A, B>(b: B, f: (k: K, b: B, a: A) => B): (fa: Record<K, A>) => B
  <A, B>(b: B, f: (k: string, b: B, a: A) => B): (fa: Record<string, A>) => B
} = RR.reduceWithIndex

export const reduceWithIndex_: {
  <K extends string, A, B>(fa: Record<K, A>, b: B, f: (k: K, b: B, a: A) => B): B
  <A, B>(fa: Record<string, A>, b: B, f: (k: string, b: B, a: A) => B): B
} = RR.reduceWithIndex_

export const foldMapWithIndex: {
  <M>(M: Monoid<M>): <K extends string, A>(
    f: (k: K, a: A) => M
  ) => (fa: Record<K, A>) => M
  <M>(M: Monoid<M>): <A>(f: (k: string, a: A) => M) => (fa: Record<string, A>) => M
} = RR.foldMapWithIndex

export const foldMapWithIndex_: {
  <M>(M: Monoid<M>): <K extends string, A>(fa: Record<K, A>, f: (k: K, a: A) => M) => M
  <M>(M: Monoid<M>): <A>(fa: Record<string, A>, f: (k: string, a: A) => M) => M
} = RR.foldMapWithIndex_

export const reduceRightWithIndex: {
  <K extends string, A, B>(b: B, f: (k: K, a: A, b: B) => B): (fa: Record<K, A>) => B
  <A, B>(b: B, f: (k: string, a: A, b: B) => B): (fa: Record<string, A>) => B
} = RR.reduceRightWithIndex

export const reduceRightWithIndex_: {
  <K extends string, A, B>(fa: Record<K, A>, b: B, f: (k: K, a: A, b: B) => B): B
  <A, B>(fa: Record<string, A>, b: B, f: (k: string, a: A, b: B) => B): B
} = RR.reduceRightWithIndex_

/**
 * Create a record with one key/value pair
 */
export function singleton<K extends string, A>(k: K, a: A): Record<K, A> {
  return { [k]: a } as any
}

export const traverseWithIndex: {
  <F extends URIS4>(F: CApplicative4MAP<F>): <K extends string, S, R, E, A, B>(
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAPC<F, E>): <K extends string, S, R, A, B>(
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4MA<F>): <K extends string, S, R, E, A, B>(
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAC<F, E>): <K extends string, S, R, A, B>(
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, S, R, E, A, B>(
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, R, E, A, B>(
    f: (k: K, a: A) => Kind3<F, R, E, B>
  ) => (ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, R, A, B>(
    f: (k: K, a: A) => Kind3<F, R, E, B>
  ) => (ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, E, A, B>(
    f: (k: K, a: A) => Kind2<F, E, B>
  ) => (ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A, B>(
    f: (k: K, a: A) => Kind2<F, E, B>
  ) => (ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B>(
    f: (k: K, a: A) => Kind<F, B>
  ) => (ta: Record<K, A>) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <K extends string, A, B>(
    f: (k: K, a: A) => HKT<F, B>
  ) => (ta: Record<K, A>) => HKT<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (k: string, a: A) => HKT<F, B>
  ) => (ta: Record<string, A>) => HKT<F, Record<string, B>>
} = RR.traverseWithIndex

export const traverseWithIndex_: {
  <F extends URIS4>(F: CApplicative4MAP<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAPC<F, E>): <K extends string, S, R, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4MA<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAC<F, E>): <K extends string, S, R, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, R, E, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, R, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, E, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Record<K, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => Kind<F, B>
  ) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (k: K, a: A) => HKT<F, B>
  ) => HKT<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Record<string, A>,
    f: (k: string, a: A) => HKT<F, B>
  ) => HKT<F, Record<string, B>>
} = RR.traverseWithIndex_

export const traverse: {
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <S, R, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <S, R, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => <K extends string>(ta: Record<K, A>) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => <K extends string>(ta: Record<K, A>) => HKT<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: Record<string, A>) => HKT<F, Record<string, B>>
} = RR.traverse

export const traverse_: {
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <K extends string, S, R, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <K extends string, S, R, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, S, R, E, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, R, E, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, R, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, E, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Record<K, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (a: A) => Kind<F, B>
  ) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <K extends string, A, B>(
    ta: Record<K, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Record<string, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, Record<string, B>>
} = RR.traverse_

export const sequence: {
  <F extends URIS4, E>(F: CApplicative4MAC<F, E>): <K extends string, S, R, A>(
    ta: Record<K, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Record<K, A>>
  <F extends URIS4, E>(F: CApplicative4MAPC<F, E>): <K extends string, S, R, A>(
    ta: Record<K, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, Record<K, A>>
  <F extends URIS4>(F: CApplicative4MA<F>): <K extends string, S, R, E, A>(
    ta: Record<K, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Record<K, A>>
  <F extends URIS4>(F: CApplicative4MAP<F>): <K extends string, S, R, E, A>(
    ta: Record<K, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, Record<K, A>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, S, R, E, A>(
    ta: Record<K, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Record<K, A>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, R, E, A>(
    ta: Record<K, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, Record<K, A>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, R, A>(
    ta: Record<K, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, Record<K, A>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, E, A>(
    ta: Record<K, Kind2<F, E, A>>
  ) => Kind2<F, E, Record<K, A>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A>(
    ta: Record<K, Kind2<F, E, A>>
  ) => Kind2<F, E, Record<K, A>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A>(
    ta: Record<K, Kind<F, A>>
  ) => Kind<F, Record<K, A>>
  <F>(F: CApplicative<F>): <K extends string, A>(
    ta: Record<K, HKT<F, A>>
  ) => HKT<F, Record<K, A>>
  <F>(F: CApplicative<F>): <A>(
    ta: Record<string, HKT<F, A>>
  ) => HKT<F, Record<string, A>>
} = RR.sequence

export const partitionMapWithIndex: {
  <K extends string, A, B, C>(f: (key: K, a: A) => Either<B, C>): (
    fa: Record<K, A>
  ) => Separated<Record<string, B>, Record<string, C>>
  <A, B, C>(f: (key: string, a: A) => Either<B, C>): (
    fa: Record<string, A>
  ) => Separated<Record<string, B>, Record<string, C>>
} = RR.partitionMapWithIndex

export const partitionMapWithIndex_: {
  <K extends string, A, B, C>(
    fa: Record<K, A>,
    f: (key: K, a: A) => Either<B, C>
  ): Separated<Record<string, B>, Record<string, C>>
  <A, B, C>(fa: Record<string, A>, f: (key: string, a: A) => Either<B, C>): Separated<
    Record<string, B>,
    Record<string, C>
  >
} = RR.partitionMapWithIndex_

export const partitionWithIndex: {
  <K extends string, A, B extends A>(
    refinementWithIndex: RefinementWithIndex<K, A, B>
  ): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, B>>
  <K extends string, A>(predicateWithIndex: PredicateWithIndex<K, A>): (
    fa: Record<K, A>
  ) => Separated<Record<string, A>, Record<string, A>>
  <A>(predicateWithIndex: PredicateWithIndex<string, A>): (
    fa: Record<string, A>
  ) => Separated<Record<string, A>, Record<string, A>>
} = RR.partitionWithIndex

export const partitionWithIndex_: {
  <K extends string, A, B extends A>(
    fa: Record<K, A>,
    refinementWithIndex: RefinementWithIndex<K, A, B>
  ): Separated<Record<string, A>, Record<string, B>>
  <K extends string, A>(
    fa: Record<K, A>,
    predicateWithIndex: PredicateWithIndex<K, A>
  ): Separated<Record<string, A>, Record<string, A>>
  <A>(
    fa: Record<string, A>,
    predicateWithIndex: PredicateWithIndex<string, A>
  ): Separated<Record<string, A>, Record<string, A>>
} = RR.partitionWithIndex_

export const filterMapWithIndex: {
  <K extends string, A, B>(f: (key: K, a: A) => Option<B>): (
    fa: Record<K, A>
  ) => Record<string, B>
  <A, B>(f: (key: string, a: A) => Option<B>): (
    fa: Record<string, A>
  ) => Record<string, B>
} = RR.filterMapWithIndex

export const filterMapWithIndex_: {
  <K extends string, A, B>(fa: Record<K, A>, f: (key: K, a: A) => Option<B>): Record<
    string,
    B
  >
  <A, B>(fa: Record<string, A>, f: (key: string, a: A) => Option<B>): Record<string, B>
} = RR.filterMapWithIndex_

export const filterWithIndex: {
  <K extends string, A, B extends A>(
    refinementWithIndex: RefinementWithIndex<K, A, B>
  ): (fa: Record<K, A>) => Record<string, B>
  <K extends string, A>(predicateWithIndex: PredicateWithIndex<K, A>): (
    fa: Record<K, A>
  ) => Record<string, A>
  <A>(predicateWithIndex: PredicateWithIndex<string, A>): (
    fa: Record<string, A>
  ) => Record<string, A>
} = RR.filterWithIndex

export const filterWithIndex_: {
  <K extends string, A, B extends A>(
    fa: Record<K, A>,
    refinementWithIndex: RefinementWithIndex<K, A, B>
  ): Record<string, B>
  <K extends string, A>(
    fa: Record<K, A>,
    predicateWithIndex: PredicateWithIndex<K, A>
  ): Record<string, A>
  <A>(fa: Record<string, A>, predicateWithIndex: PredicateWithIndex<string, A>): Record<
    string,
    A
  >
} = RR.filterWithIndex_

/**
 * Create a record from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export const fromFoldable: {
  <F extends URIS3, A>(M: Magma<A>, F: CFoldable3<F>): <K extends string, R, E>(
    fka: Kind3<F, R, E, readonly [K, A]>
  ) => Record<K, A>
  <F extends URIS2, A>(M: Magma<A>, F: CFoldable2<F>): <K extends string, E>(
    fka: Kind2<F, E, readonly [K, A]>
  ) => Record<K, A>
  <F extends URIS, A>(M: Magma<A>, F: CFoldable1<F>): <K extends string>(
    fka: Kind<F, readonly [K, A]>
  ) => Record<K, A>
  <F, A>(M: Magma<A>, F: CFoldable<F>): <K extends string>(
    fka: HKT<F, readonly [K, A]>
  ) => Record<K, A>
  <F, A>(M: Magma<A>, F: CFoldable<F>): (
    fka: HKT<F, readonly [string, A]>
  ) => Record<string, A>
} = RR.fromFoldable

/**
 * Create a record from a foldable collection using the specified functions to
 *
 * - map to key/value pairs
 * - combine values for duplicate keys.
 *
 * @example
 * import { getLastSemigroup } from '@matechs/core/Semigroup'
 * import { readonlyArray, zip } from '@matechs/core/Array'
 * import { identity } from '@matechs/core/Function'
 * import { Record, fromFoldableMap } from '@matechs/core/Record'
 *
 * / like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: Array<K>, values: Array<A>): Record<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), readonlyArray)(identity)(zip(keys, values))
 *
 * assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2, 3]), { a: 1, b: 2 })
 *
 * / build a record from a field
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * const users: Array<User> = [
 *   { id: 'id1', name: 'name1' },
 *   { id: 'id2', name: 'name2' },
 *   { id: 'id1', name: 'name3' }
 * ]
 *
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), readonlyArray)(user => [user.id, user])(users), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 */
export const fromFoldableMap: {
  <F extends URIS3, B>(M: Magma<B>, F: CFoldable3<F>): <A, K extends string>(
    f: (a: A) => [K, B]
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Record<K, B>
  <F extends URIS2, B>(M: Magma<B>, F: CFoldable2<F>): <A, K extends string>(
    f: (a: A) => [K, B]
  ) => <E>(fa: Kind2<F, E, A>) => Record<K, B>
  <F extends URIS, B>(M: Magma<B>, F: CFoldable1<F>): <A, K extends string>(
    f: (a: A) => [K, B]
  ) => (fa: Kind<F, A>) => Record<K, B>
  <F, B>(M: Magma<B>, F: CFoldable<F>): <A, K extends string>(
    f: (a: A) => [K, B]
  ) => (fa: HKT<F, A>) => Record<K, B>
  <F, B>(M: Magma<B>, F: CFoldable<F>): <A>(
    f: (a: A) => [string, B]
  ) => (fa: HKT<F, A>) => Record<string, B>
} = RR.fromFoldableMap

export const fromFoldableMap_: {
  <F extends URIS3, B>(M: Magma<B>, F: CFoldable3<F>): <R, E, A, K extends string>(
    fa: Kind3<F, R, E, A>,
    f: (a: A) => [K, B]
  ) => Record<K, B>
  <F extends URIS2, B>(M: Magma<B>, F: CFoldable2<F>): <E, A, K extends string>(
    fa: Kind2<F, E, A>,
    f: (a: A) => [K, B]
  ) => Record<K, B>
  <F extends URIS, B>(M: Magma<B>, F: CFoldable1<F>): <A, K extends string>(
    fa: Kind<F, A>,
    f: (a: A) => [K, B]
  ) => Record<K, B>
  <F, B>(M: Magma<B>, F: CFoldable<F>): <A, K extends string>(
    fa: HKT<F, A>,
    f: (a: A) => [K, B]
  ) => Record<K, B>
  <F, B>(M: Magma<B>, F: CFoldable<F>): <A>(
    fa: HKT<F, A>,
    f: (a: A) => [string, B]
  ) => Record<string, B>
} = RR.fromFoldableMap_

export const every: {
  <A>(predicate: Predicate<A>): (r: Record<string, A>) => boolean
} = RR.every

export const every_: {
  <A>(r: Record<string, A>, predicate: Predicate<A>): boolean
} = RR.every_

export const some: {
  <A>(predicate: (a: A) => boolean): (r: Record<string, A>) => boolean
} = RR.some

export const some_: {
  <A>(r: Record<string, A>, predicate: (a: A) => boolean): boolean
} = RR.some_

export const elem_: {
  <A>(E: Eq<A>): (fa: Record<string, A>, a: A) => boolean
} = RR.elem_

export const elem: {
  <A>(E: Eq<A>): (a: A) => (fa: Record<string, A>) => boolean
} = RR.elem

export const compact: {
  <A>(fa: Record<string, Option<A>>): Record<string, A>
} = RR.compact

export const separate: {
  <A, B>(fa: Record<string, Either<A, B>>): Separated<
    Record<string, A>,
    Record<string, B>
  >
} = RR.separate

export const wither: {
  <F extends URIS4>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => <K extends string>(wa: Record<K, A>) => HKT<F, Record<K, B>>
} = RR.wither

export const wither_: {
  <F extends URIS4>(F: CApplicative4MAP<F>): <K extends string, A, S, R, E, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAPC<F, E>): <K extends string, A, S, R, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, unknown, R, E, Record<K, B>>
  <F extends URIS4, E>(F: CApplicative4MAC<F, E>): <K extends string, A, S, R, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4MA<F>): <K extends string, A, S, R, E, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, A, S, R, E, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Record<K, B>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, A, R, E, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => Kind3<F, R, E, Record<K, B>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, A, E, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => Kind2<F, E, Record<K, B>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B>(
    wa: Record<K, A>,
    f: (a: A) => Kind<F, Option<B>>
  ) => Kind<F, Record<K, B>>
  <F>(F: CApplicative<F>): <K extends string, A, B>(
    wa: Record<K, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Record<K, B>>
} = RR.wither_

export const wilt: {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind4<F, unknown, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind4<F, unknown, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind3<F, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind3<F, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind2<F, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind2<F, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => Kind<F, Separated<Record<K, B>, Record<K, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => <K extends string>(
    wa: Record<K, A>
  ) => HKT<F, Separated<Record<K, B>, Record<K, C>>>
} = RR.wilt

export const wilt_: {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <K extends string, A, S, R, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <K extends string, A, S, R, E, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <K extends string, A, S, R, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <K extends string, A, S, R, E, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <K extends string, A, S, R, E, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <K extends string, A, R, E, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <K extends string, A, R, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <K extends string, A, E, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <K extends string, A, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<Record<K, B>, Record<K, C>>>
  <F extends URIS>(F: CApplicative1<F>): <K extends string, A, B, C>(
    wa: Record<K, A>,
    f: (a: A) => Kind<F, Either<B, C>>
  ) => Kind<F, Separated<Record<K, B>, Record<K, C>>>
  <F>(F: CApplicative<F>): <K extends string, A, B, C>(
    wa: Record<K, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Record<K, B>, Record<K, C>>>
} = RR.wilt_

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: Record<K, A>
  ) => Record<K, B>
  <A>(predicate: Predicate<A>): <K extends string>(fa: Record<K, A>) => Record<K, A>
} = RR.filter

export const filter_: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: Record<K, A>
  ) => Record<K, B>
  <A>(predicate: Predicate<A>): <K extends string>(fa: Record<K, A>) => Record<K, A>
} = RR.filter

export const filterMap: {
  <A, B>(f: (a: A) => Option<B>): <K extends string>(fa: Record<K, A>) => Record<K, B>
  <A, B>(f: (a: A) => Option<B>): (fa: Record<string, A>) => Record<string, B>
} = RR.filterMap

export const filterMap_: {
  <K extends string, A, B>(fa: Record<K, A>, f: (a: A) => Option<B>): Record<K, B>
  <A, B>(fa: Record<string, A>, f: (a: A) => Option<B>): Record<string, B>
} = RR.filterMap_

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Record<string, A>) => M = RR.foldMap

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: Record<string, A>, f: (a: A) => M) => M = RR.foldMap_

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, A>, Record<K, B>>
  <A>(predicate: Predicate<A>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, A>, Record<K, A>>
} = RR.partition

export const partition_: {
  <K extends string, A, B extends A>(
    fa: Record<K, A>,
    refinement: Refinement<A, B>
  ): Separated<Record<K, A>, Record<K, B>>
  <K extends string, A>(fa: Record<K, A>, predicate: Predicate<A>): Separated<
    Record<K, A>,
    Record<K, A>
  >
} = RR.partition_

export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, B>, Record<K, C>>
  <A, B, C>(f: (a: A) => Either<B, C>): (
    fa: Record<string, A>
  ) => Separated<Record<string, B>, Record<string, C>>
} = RR.partitionMap

export const partitionMap_: {
  <K extends string, A, B, C>(fa: Record<K, A>, f: (a: A) => Either<B, C>): Separated<
    Record<K, B>,
    Record<K, C>
  >
  <A, B, C>(fa: Record<string, A>, f: (a: A) => Either<B, C>): Separated<
    Record<string, B>,
    Record<string, C>
  >
} = RR.partitionMap_

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Record<string, A>) => B = RR.reduce

export const reduce_: <A, B>(fa: Record<string, A>, b: B, f: (b: B, a: A) => B) => B =
  RR.reduce_

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Record<string, A>) => B = RR.reduceRight

export const reduceRight_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = RR.reduceRight_

export const toArray: <K extends string, A>(r: Record<K, A>) => Array<readonly [K, A]> =
  /*#__PURE__*/
  (() => collect((k, a) => [k, a]))() as any

/**
 * Unfolds a record into a list of key/value pairs
 */
export const toUnfoldable: {
  <F extends URIS>(U: CUnfoldable1<F>): <K extends string, A>(
    r: Record<K, A>
  ) => Kind<F, readonly [K, A]>
  <F>(U: CUnfoldable<F>): <K extends string, A>(
    r: Record<K, A>
  ) => HKT<F, readonly [K, A]>
  <F>(U: CUnfoldable<F>): <A>(r: Record<string, A>) => HKT<F, readonly [string, A]>
} = RR.toUnfoldable

export const recordFoldable: CFoldable1<URI> = {
  URI,
  foldMap,
  reduce,
  reduceRight
}

export const record: CFunctorWithIndex1<URI, string> &
  CFoldable1<URI> &
  CTraversableWithIndex1<URI, string> &
  CCompactable1<URI> &
  CFilterableWithIndex1<URI, string> &
  CWitherable1<URI> &
  CFoldableWithIndex1<URI, string> = {
  URI,
  map,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap,
  wither,
  wilt,
  mapWithIndex,
  reduceWithIndex,
  foldMapWithIndex,
  reduceRightWithIndex,
  traverseWithIndex,
  partitionMapWithIndex,
  partitionWithIndex,
  filterMapWithIndex,
  filterWithIndex
}
