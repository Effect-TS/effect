import type {
  URIS,
  Kind,
  HKT,
  URIS3,
  Applicative3,
  Kind3,
  Applicative3C,
  URIS2,
  Applicative2,
  Kind2,
  Applicative2C,
  Applicative1,
  Applicative,
  Separated,
  RefinementWithIndex,
  PredicateWithIndex,
  Foldable3,
  Foldable2,
  Foldable1,
  Foldable,
  FunctorWithIndex1,
  TraversableWithIndex1,
  Compactable1,
  FilterableWithIndex1,
  Witherable1,
  FoldableWithIndex1,
  Partition1,
  Filter1,
  Traverse1,
  Kind4,
  Wither1,
  Wilt1,
  TraverseWithIndex1,
  PartitionWithIndex1,
  FilterWithIndex1,
  URIS4,
  Applicative4
} from "../Base"
import type { Either } from "../Either/either"
import type { Eq } from "../Eq"
import type { Predicate, Refinement } from "../Function"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import type { Option } from "../Option"
import * as RR from "../Readonly/Record"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"
import type {
  Applicative4EC,
  MaURIS,
  Applicative4ECP,
  Applicative4EP,
  Applicative4E
} from "../Support/Overloads/overloads"

export const URI = "@matechs/core/Record"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Record<string, A>
  }
}

export const getShow: <A>(S: Show<A>) => Show<Record<string, A>> = RR.getShow

/**
 * Calculate the number of key/value pairs in a record
 */
export const size: (r: Record<string, unknown>) => number = RR.size

/**
 * Test whether a record is empty
 */
export const isEmpty: (r: Record<string, unknown>) => boolean = RR.isEmpty

export const keys: <K extends string>(
  r: Record<K, unknown>
) => Array<K> = RR.keys as any

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
export const collect: <K extends string, A, B>(
  f: (k: K, a: A) => B
) => (r: Record<K, A>) => Array<B> = RR.collect as any

/**
 * Insert or replace a key/value pair in a record
 */
export function insertAt<K extends string, A>(
  k: K,
  a: A
): <KS extends string>(r: Record<KS, A>) => Record<KS | K, A>
export function insertAt<A>(
  k: string,
  a: A
): (r: Record<string, A>) => Record<string, A> {
  return RR.insertAt(k, a) as any
}

export const hasOwnProperty: <K extends string>(
  k: string,
  r: Record<K, unknown>
) => k is K = RR.hasOwnProperty

/**
 * Delete a key and value from a map
 */
export function deleteAt<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Record<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt(k: string): <A>(r: Record<string, A>) => Record<string, A> {
  return RR.deleteAt(k) as any
}

export const updateAt: <A>(
  k: string,
  a: A
) => <K extends string>(r: Record<K, A>) => Option<Record<K, A>> = RR.updateAt

export const modifyAt: <A>(
  k: string,
  f: (a: A) => A
) => <K extends string>(r: Record<K, A>) => Option<Record<K, A>> = RR.modifyAt

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Option<[A, Record<string extends K ? string : Exclude<KS, K>, A>]>
export function pop(
  k: string
): <A>(r: Record<string, A>) => Option<[A, Record<string, A>]> {
  return RR.pop(k) as any
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export const isSubrecord: <A>(
  E: Eq<A>
) => (x: Record<string, A>, y: Record<string, A>) => boolean = RR.isSubrecord

export function getEq<K extends string, A>(E: Eq<A>): Eq<Record<K, A>>
export function getEq<A>(E: Eq<A>): Eq<Record<string, A>> {
  return RR.getEq(E)
}

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
export function getMonoid<K extends string, A>(S: Semigroup<A>): Monoid<Record<K, A>>
export function getMonoid<A>(S: Semigroup<A>): Monoid<Record<string, A>> {
  return RR.getMonoid(S)
}

/**
 * Lookup the value for a key in a record
 */
export const lookup: <A>(k: string, r: Record<string, A>) => Option<A> = RR.lookup

export const empty: Record<string, never> = {}

/**
 * Map a record passing the keys to the iterating function
 */
export function mapWithIndex<K extends string, A, B>(
  f: (k: K, a: A) => B
): (fa: Record<K, A>) => Record<K, B>
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return RR.mapWithIndex(f)
}

/**
 * Map a record passing the values to the iterating function
 */
export function map<A, B>(
  f: (a: A) => B
): <K extends string>(fa: Record<K, A>) => Record<K, B>
export function map<A, B>(
  f: (a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return RR.map(f)
}

export function reduceWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, b: B, a: A) => B
): (fa: Record<K, A>) => B
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: Record<string, A>) => B {
  return RR.reduceWithIndex(b, f)
}

export function foldMapWithIndex<M>(
  M: Monoid<M>
): <K extends string, A>(f: (k: K, a: A) => M) => (fa: Record<K, A>) => M
export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (k: string, a: A) => M) => (fa: Record<string, A>) => M {
  return RR.foldMapWithIndex(M)
}

export function reduceRightWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, a: A, b: B) => B
): (fa: Record<K, A>) => B
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: Record<string, A>) => B {
  return RR.reduceRightWithIndex(b, f)
}

/**
 * Create a record with one key/value pair
 */
export const singleton: <K extends string, A>(k: K, a: A) => Record<K, A> = RR.singleton

export function traverseWithIndex<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A, B>(
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => (ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverseWithIndex<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A, B>(
  f: (k: K, a: A) => Kind3<F, R, E, B>
) => (ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverseWithIndex<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A, B>(
  f: (k: K, a: A) => Kind2<F, E, B>
) => (ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverseWithIndex<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A, B>(
  f: (k: K, a: A) => Kind2<F, E, B>
) => (ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverseWithIndex<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A, B>(
  f: (k: K, a: A) => Kind<F, B>
) => (ta: Record<K, A>) => Kind<F, Record<K, B>>
export function traverseWithIndex<F>(
  F: Applicative<F>
): <K extends string, A, B>(
  f: (k: K, a: A) => HKT<F, B>
) => (ta: Record<K, A>) => HKT<F, Record<K, B>>
export function traverseWithIndex<F>(
  F: Applicative<F>
): <A, B>(
  f: (k: string, a: A) => HKT<F, B>
) => (ta: Record<string, A>) => HKT<F, Record<string, B>> {
  return RR.traverseWithIndex(F)
}

export function traverse<F extends MaURIS, E>(
  F: Applicative4EC<F, E>
): <S, R, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
export function traverse<F extends MaURIS, E>(
  F: Applicative4ECP<F, E>
): <S, R, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
export function traverse<F extends MaURIS>(
  F: Applicative4EP<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind4<F, unknown, R, E, Record<K, B>>
export function traverse<F extends MaURIS>(
  F: Applicative4E<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
export function traverse<F extends URIS4>(
  F: Applicative4<F>
): <S, R, E, A, B>(
  f: (a: A) => Kind4<F, S, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind4<F, S, R, E, Record<K, B>>
export function traverse<F extends URIS3>(
  F: Applicative3<F>
): <R, E, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverse<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <R, A, B>(
  f: (a: A) => Kind3<F, R, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind3<F, R, E, Record<K, B>>
export function traverse<F extends URIS2>(
  F: Applicative2<F>
): <E, A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverse<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <A, B>(
  f: (a: A) => Kind2<F, E, B>
) => <K extends string>(ta: Record<K, A>) => Kind2<F, E, Record<K, B>>
export function traverse<F extends URIS>(
  F: Applicative1<F>
): <A, B>(
  f: (a: A) => Kind<F, B>
) => <K extends string>(ta: Record<K, A>) => Kind<F, Record<K, B>>
export function traverse<F>(
  F: Applicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => <K extends string>(ta: Record<K, A>) => HKT<F, Record<K, B>>
export function traverse<F>(
  F: Applicative<F>
): <A, B>(
  f: (a: A) => HKT<F, B>
) => (ta: Record<string, A>) => HKT<F, Record<string, B>> {
  return RR.traverse(F)
}

export function partitionMapWithIndex<K extends string, A, B, C>(
  f: (key: K, a: A) => Either<B, C>
): (fa: Record<K, A>) => Separated<Record<string, B>, Record<string, C>>
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (fa: Record<string, A>) => Separated<Record<string, B>, Record<string, C>> {
  return RR.partitionMapWithIndex(f)
}

export function partitionWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, B>>
export function partitionWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, A>>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Separated<Record<string, A>, Record<string, A>> {
  return RR.partitionWithIndex(predicateWithIndex)
}

export function filterMapWithIndex<K extends string, A, B>(
  f: (key: K, a: A) => Option<B>
): (fa: Record<K, A>) => Record<string, B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => Option<B>
): (fa: Record<string, A>) => Record<string, B> {
  return RR.filterMapWithIndex(f)
}

export function filterWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Record<string, B>
export function filterWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Record<string, A>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Record<string, A> {
  return RR.filterWithIndex(predicateWithIndex)
}

/**
 * Create a record from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export function fromFoldable<F extends URIS3, A>(
  M: Magma<A>,
  F: Foldable3<F>
): <K extends string, R, E>(fka: Kind3<F, R, E, [K, A]>) => Record<K, A>
export function fromFoldable<F extends URIS2, A>(
  M: Magma<A>,
  F: Foldable2<F>
): <K extends string, E>(fka: Kind2<F, E, [K, A]>) => Record<K, A>
export function fromFoldable<F extends URIS, A>(
  M: Magma<A>,
  F: Foldable1<F>
): <K extends string>(fka: Kind<F, [K, A]>) => Record<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: Foldable<F>
): <K extends string>(fka: HKT<F, [K, A]>) => Record<K, A>
export function fromFoldable<F, A>(
  M: Magma<A>,
  F: Foldable<F>
): (fka: HKT<F, [string, A]>) => Record<string, A> {
  return RR.fromFoldable(M, F)
}

/**
 * Create a record from a foldable collection using the specified functions to
 *
 * - map to key/value pairs
 * - combine values for duplicate keys.
 *
 * @example
 * import { getLastSemigroup } from '@matechs/core/Semigroup'
 * import { array, zip } from '@matechs/core/Array'
 * import { identity } from '@matechs/core/Function'
 * import { fromFoldableMap } from '@matechs/core/Record'
 *
 * // like lodash `zipObject` or ramda `zipObj`
 * export const zipObject = <K extends string, A>(keys: Array<K>, values: Array<A>): Record<K, A> =>
 *   fromFoldableMap(getLastSemigroup<A>(), array)(zip(keys, values), identity)
 *
 * assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2, 3]), { a: 1, b: 2 })
 *
 * // build a record from a field
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
 * assert.deepStrictEqual(fromFoldableMap(getLastSemigroup<User>(), array)(users, user => [user.id, user]), {
 *   id1: { id: 'id1', name: 'name3' },
 *   id2: { id: 'id2', name: 'name2' }
 * })
 */
export function fromFoldableMap<F extends URIS3, B>(
  M: Magma<B>,
  F: Foldable3<F>
): <R, E, A, K extends string>(
  fa: Kind3<F, R, E, A>,
  f: (a: A) => [K, B]
) => Record<K, B>
export function fromFoldableMap<F extends URIS2, B>(
  M: Magma<B>,
  F: Foldable2<F>
): <E, A, K extends string>(fa: Kind2<F, E, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F extends URIS, B>(
  M: Magma<B>,
  F: Foldable1<F>
): <A, K extends string>(fa: Kind<F, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A, K extends string>(fa: HKT<F, A>, f: (a: A) => [K, B]) => Record<K, B>
export function fromFoldableMap<F, B>(
  M: Magma<B>,
  F: Foldable<F>
): <A>(fa: HKT<F, A>, f: (a: A) => [string, B]) => Record<string, B> {
  return RR.fromFoldableMap(M, F)
}

export const every: <A>(predicate: Predicate<A>) => (r: Record<string, A>) => boolean =
  RR.every

export const some: <A>(
  predicate: (a: A) => boolean
) => (r: Record<string, A>) => boolean = RR.some

export const elem: <A>(E: Eq<A>) => (a: A, fa: Record<string, A>) => boolean = RR.elem

export const map_: <A, B>(fa: Record<string, A>, f: (a: A) => B) => Record<string, B> =
  RR.map_

export const reduce_: <A, B>(fa: Record<string, A>, b: B, f: (b: B, a: A) => B) => B =
  RR.reduce_

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: Record<string, A>, f: (a: A) => M) => M = RR.foldMap_

export const reduceRight_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = RR.reduceRight_

export const traverse_: Traverse1<URI> = RR.traverse_ as any

export function sequence<F extends MaURIS, E>(
  F: Applicative4ECP<F, E>
): <K extends string, S, R, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, Record<K, A>>
export function sequence<F extends MaURIS, E>(
  F: Applicative4EC<F, E>
): <K extends string, S, R, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, Record<K, A>>
export function sequence<F extends MaURIS>(
  F: Applicative4EP<F>
): <K extends string, S, R, E, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, unknown, R, E, Record<K, A>>
export function sequence<F extends MaURIS>(
  F: Applicative4E<F>
): <K extends string, S, R, E, A>(
  ta: Record<K, Kind4<F, S, R, E, A>>
) => Kind4<F, S, R, E, Record<K, A>>
export function sequence<F extends URIS3>(
  F: Applicative3<F>
): <K extends string, R, E, A>(
  ta: Record<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, Record<K, A>>
export function sequence<F extends URIS3, E>(
  F: Applicative3C<F, E>
): <K extends string, R, A>(
  ta: Record<K, Kind3<F, R, E, A>>
) => Kind3<F, R, E, Record<K, A>>
export function sequence<F extends URIS2>(
  F: Applicative2<F>
): <K extends string, E, A>(ta: Record<K, Kind2<F, E, A>>) => Kind2<F, E, Record<K, A>>
export function sequence<F extends URIS2, E>(
  F: Applicative2C<F, E>
): <K extends string, A>(ta: Record<K, Kind2<F, E, A>>) => Kind2<F, E, Record<K, A>>
export function sequence<F extends URIS>(
  F: Applicative1<F>
): <K extends string, A>(ta: Record<K, Kind<F, A>>) => Kind<F, Record<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <K extends string, A>(ta: Record<K, HKT<F, A>>) => HKT<F, Record<K, A>>
export function sequence<F>(
  F: Applicative<F>
): <A>(ta: Record<string, HKT<F, A>>) => HKT<F, Record<string, A>> {
  return RR.sequence(F)
}

export const compact: <A>(fa: Record<string, Option<A>>) => Record<string, A> =
  RR.compact

export const separate: <A, B>(
  fa: Record<string, Either<A, B>>
) => Separated<Record<string, A>, Record<string, B>> = RR.separate

export const filterMap_: <A, B>(
  fa: Record<string, A>,
  f: (a: A) => Option<B>
) => Record<string, B> = RR.filterMap_

export const filter_: Filter1<URI> = RR.filter_

export const partition_: Partition1<URI> = RR.partition_

export const partitionMap_: <A, B, C>(
  fa: Record<string, A>,
  f: (a: A) => Either<B, C>
) => Separated<Record<string, B>, Record<string, C>> = RR.partitionMap_

export const wither_: Wither1<URI> = RR.wither_ as any

export const wilt_: Wilt1<URI> = RR.wilt_ as any

export const mapWithIndex_: <A, B>(
  fa: Record<string, A>,
  f: (i: string, a: A) => B
) => Record<string, B> = RR.mapWithIndex_

export const reduceRightWithIndex_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (i: string, a: A, b: B) => B
) => B = RR.reduceRightWithIndex_

export const reduceWithIndex_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (i: string, b: B, a: A) => B
) => B = RR.reduceWithIndex_

export const filterMapWithIndex_: <A, B>(
  fa: Record<string, A>,
  f: (i: string, a: A) => Option<B>
) => Record<string, B> = RR.filterMapWithIndex_

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: Record<string, A>, f: (i: string, a: A) => M) => M = RR.foldMapWithIndex_

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  string
> = RR.traverseWithIndex_ as any

export const partitionMapWithIndex_: <A, B, C>(
  fa: Record<string, A>,
  f: (i: string, a: A) => Either<B, C>
) => Separated<Record<string, B>, Record<string, C>> = RR.partitionMapWithIndex_

export const partitionWithIndex_: PartitionWithIndex1<URI, string> =
  RR.partitionWithIndex_

export const filterWithIndex_: FilterWithIndex1<URI, string> = RR.filterWithIndex_

export const record: FunctorWithIndex1<URI, string> &
  Foldable1<URI> &
  TraversableWithIndex1<URI, string> &
  Compactable1<URI> &
  FilterableWithIndex1<URI, string> &
  Witherable1<URI> &
  FoldableWithIndex1<URI, string> = {
  URI,
  map: map_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse_,
  sequence,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  wither: wither_,
  wilt: wilt_,
  mapWithIndex: mapWithIndex_,
  reduceWithIndex: reduceWithIndex_,
  foldMapWithIndex: foldMapWithIndex_,
  reduceRightWithIndex: reduceRightWithIndex_,
  traverseWithIndex: traverseWithIndex_,
  partitionMapWithIndex: partitionMapWithIndex_,
  partitionWithIndex: partitionWithIndex_,
  filterMapWithIndex: filterMapWithIndex_,
  filterWithIndex: filterWithIndex_
}

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Record<string, A>
  ) => Record<string, B>
  <A>(predicate: Predicate<A>): (fa: Record<string, A>) => Record<string, A>
} = RR.filter

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: Record<string, A>) => Record<string, B> = RR.filterMap

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Record<string, A>) => M = RR.foldMap

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Record<string, A>
  ) => Separated<Record<string, A>, Record<string, B>>
  <A>(predicate: Predicate<A>): (
    fa: Record<string, A>
  ) => Separated<Record<string, A>, Record<string, A>>
} = RR.partition

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: Record<string, A>) => Separated<Record<string, B>, Record<string, C>> =
  RR.partitionMap

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Record<string, A>) => B = RR.reduce

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Record<string, A>) => B = RR.reduceRight
