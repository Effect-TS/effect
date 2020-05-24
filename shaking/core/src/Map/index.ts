/* adapted from https://github.com/gcanti/fp-ts */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
  CFilter2,
  CFilterable2,
  CFilterableWithIndex2C,
  CFoldable,
  CFoldable1,
  CFoldable2,
  CFoldable3,
  CPartition2,
  CSequence2C,
  CTraversableWithIndex2C,
  CTraverse2C,
  CTraverseWithIndex2C,
  CUnfoldable,
  CUnfoldable1,
  CWilt2C,
  CWither2C,
  CWitherable2C,
  Filter2,
  HKT,
  Kind,
  Kind2,
  Kind3,
  Partition2,
  Separated,
  Traverse2C,
  TraverseWithIndex2C,
  URIS,
  URIS2,
  URIS3,
  Wither2C,
  Wilt2C
} from "../Base"
import { Either } from "../Either"
import type { Eq } from "../Eq"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import * as Op from "../Option"
import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export const collect: {
  <K>(O: Ord<K>): <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>) => Array<B>
} = RM.collect as any

export const collect_: {
  <K>(O: Ord<K>): <A, B>(m: Map<K, A>, f: (k: K, a: A) => B) => Array<B>
} = RM.collect_ as any

export const compact: {
  <K, A>(fa: Map<K, Op.Option<A>>): Map<K, A>
} = RM.compact as any

/**
 * Delete a key and value from a map
 */
export const deleteAt: {
  <K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Map<K, A>
} = RM.deleteAt as any

export const deleteAt_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Map<K, A>
} = RM.deleteAt_ as any

/**
 * Test whether or not a value is a member of a map
 */
export const elem: {
  <A>(E: Eq<A>): (a: A) => <K>(m: Map<K, A>) => boolean
} = RM.elem as any

export const elem_: {
  <A>(E: Eq<A>): <K>(m: Map<K, A>, a: A) => boolean
} = RM.elem_ as any

export const empty: Map<never, never> =
  /*#__PURE__*/
  (() => new Map<never, never>())()

export const filter: CFilter2<URI> = RM.filter as any

export const filter_: Filter2<URI> = RM.filter_ as any

export const filterMap: <A, B>(
  f: (a: A) => Op.Option<B>
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.filterMap as any

export const filterMap_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Op.Option<B>
) => Map<E, B> = RM.filterMap_ as any

export const filterMapWithIndex: {
  <K, A, B>(f: (k: K, a: A) => Op.Option<B>): (fa: Map<K, A>) => Map<K, B>
} = RM.filterMapWithIndex as any

export const filterMapWithIndex_: {
  <K, A, B>(fa: Map<K, A>, f: (k: K, a: A) => Op.Option<B>): Map<K, B>
} = RM.filterMapWithIndex_ as any

export const filterWithIndex: {
  <K, A>(p: (k: K, a: A) => boolean): (fa: Map<K, A>) => Map<K, A>
} = RM.filterWithIndex as any

export const filterWithIndex_: {
  <K, A>(fa: Map<K, A>, p: (k: K, a: A) => boolean): Map<K, A>
} = RM.filterWithIndex_ as any

/**
 * Create a map from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export const fromFoldable: {
  <F extends URIS3, K, A>(E: Eq<K>, M: Magma<A>, F: CFoldable3<F>): <R, E>(
    fka: Kind3<F, R, E, [K, A]>
  ) => Map<K, A>
  <F extends URIS2, K, A>(E: Eq<K>, M: Magma<A>, F: CFoldable2<F>): <E>(
    fka: Kind2<F, E, [K, A]>
  ) => Map<K, A>
  <F extends URIS, K, A>(E: Eq<K>, M: Magma<A>, F: CFoldable1<F>): (
    fka: Kind<F, [K, A]>
  ) => Map<K, A>
  <F, K, A>(E: Eq<K>, M: Magma<A>, F: CFoldable<F>): (fka: HKT<F, [K, A]>) => Map<K, A>
} = RM.fromFoldable as any

export const getEq: {
  <K, A>(SK: Eq<K>, SA: Eq<A>): Eq<Map<K, A>>
} = RM.getEq as any

export const getFilterableWithIndex: {
  <K = never>(): CFilterableWithIndex2C<URI, K, K>
} = RM.getFilterableWithIndex as any

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 */
export const getMonoid: {
  <K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<Map<K, A>>
} = RM.getMonoid as any

export const getShow: {
  <K, A>(SK: Show<K>, SA: Show<A>): Show<Map<K, A>>
} = RM.getShow as any

export const traverseWithIndex: {
  <K>(_: Ord<K>): CTraverseWithIndex2C<URI, K, K>
} = RM.traverseWithIndex as any

export const traverseWithIndex_: {
  <K>(_: Ord<K>): TraverseWithIndex2C<URI, K, K>
} = RM.traverseWithIndex_ as any

export const traverse: {
  <K>(_: Ord<K>): CTraverse2C<URI, K>
} = RM.traverse as any

export const traverse_: {
  <K>(_: Ord<K>): Traverse2C<URI, K>
} = RM.traverse_ as any

export const reduceWithIndex: {
  <K>(_: Ord<K>): <A, B>(b: B, f: (k: K, b: B, a: A) => B) => (fa: Map<K, A>) => B
} = RM.reduceWithIndex as any

export const reduceWithIndex_: {
  <K>(_: Ord<K>): <A, B>(fa: Map<K, A>, b: B, f: (k: K, b: B, a: A) => B) => B
} = RM.reduceWithIndex_ as any

export const foldMapWithIndex: {
  <K>(_: Ord<K>): <M>(M: Monoid<M>) => <A>(f: (k: K, a: A) => M) => (fa: Map<K, A>) => M
} = RM.foldMapWithIndex as any

export const foldMapWithIndex_: {
  <K>(_: Ord<K>): <M>(M: Monoid<M>) => <A>(fa: Map<K, A>, f: (k: K, a: A) => M) => M
} = RM.foldMapWithIndex_ as any

export const reduceRightWithIndex: {
  <K>(_: Ord<K>): <A, B>(b: B, f: (k: K, a: A, b: B) => B) => (fa: Map<K, A>) => B
} = RM.reduceRightWithIndex as any

export const reduceRightWithIndex_: {
  <K>(_: Ord<K>): <A, B>(fa: Map<K, A>, b: B, f: (k: K, a: A, b: B) => B) => B
} = RM.reduceRightWithIndex_ as any

export const sequence: { <K>(_: Ord<K>): CSequence2C<URI, K> } = RM.sequence as any

export const wilt: {
  <K>(_: Ord<K>): CWilt2C<URI, K>
} = RM.wilt as any

export const wilt_: {
  <K>(_: Ord<K>): Wilt2C<URI, K>
} = RM.wilt_ as any

export const wither: {
  <K>(_: Ord<K>): CWither2C<URI, K>
} = RM.wither as any

export const wither_: {
  <K>(_: Ord<K>): Wither2C<URI, K>
} = RM.wither_ as any

export const reduce: {
  <K>(_: Ord<K>): <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Map<K, A>) => B
} = RM.reduce as any

export const reduce_: {
  <K>(_: Ord<K>): <A, B>(fa: Map<K, A>, b: B, f: (b: B, a: A) => B) => B
} = RM.reduce_ as any

export const foldMap: {
  <K>(_: Ord<K>): <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Map<K, A>) => M
} = RM.foldMap as any

export const foldMap_: {
  <K>(_: Ord<K>): <M>(M: Monoid<M>) => <A>(fa: Map<K, A>, f: (a: A) => M) => M
} = RM.foldMap_ as any

export const reduceRight: {
  <K>(_: Ord<K>): <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Map<K, A>) => B
} = RM.reduceRight as any

export const reduceRight_: {
  <K>(_: Ord<K>): <A, B>(fa: Map<K, A>, b: B, f: (a: A, b: B) => B) => B
} = RM.reduceRight_ as any

export const getWitherable: {
  <K>(O: Ord<K>): CWitherable2C<URI, K> & CTraversableWithIndex2C<URI, K, K>
} = RM.getWitherable as any

/**
 * Insert or replace a key/value pair in a map
 */
export const insertAt: {
  <K>(E: Eq<K>): <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A>
} = RM.insertAt as any

export const insertAt_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K, a: A) => Map<K, A>
} = RM.insertAt_ as any

/**
 * Test whether or not a map is empty
 */
export const isEmpty: {
  <K, A>(d: Map<K, A>): boolean
} = RM.isEmpty as any

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 */
export const isSubmap: {
  <K, A>(SK: Eq<K>, SA: Eq<A>): (d1: Map<K, A>, d2: Map<K, A>) => boolean
} = RM.isSubmap as any

/**
 * Get a sorted array of the keys contained in a map
 */
export const keys: {
  <K>(O: Ord<K>): <A>(m: Map<K, A>) => Array<K>
} = RM.keys as any

export const keys_: {
  <K, A>(m: Map<K, A>, O: Ord<K>): Array<K>
} = RM.keys_ as any

/**
 * Lookup the value for a key in a `Map`.
 */
export const lookup: {
  <K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Op.Option<A>
} = RM.lookup as any

export const lookup_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Op.Option<A>
} = RM.lookup_ as any

/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 */
export const lookupWithKey: {
  <K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Op.Option<[K, A]>
} = RM.lookupWithKey as any

export const lookupWithKey_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Op.Option<[K, A]>
} = RM.lookupWithKey as any

export const map_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => B
) => Map<E, B> = RM.map_ as any

export const map: <A, B>(
  f: (a: A) => B
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.map as any

export const mapWithIndex: <K, A, B>(
  f: (k: K, a: A) => B
) => (fa: Map<K, A>) => Map<K, B> = RM.mapWithIndex as any

export const mapWithIndex_: <K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => B
) => Map<K, B> = RM.mapWithIndex_ as any

/**
 * Test whether or not a key exists in a map
 */
export const member: {
  <K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => boolean
} = RM.member as any

export const member_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => boolean
} = RM.member_ as any

export const modifyAt: {
  <K>(E: Eq<K>): <A>(k: K, f: (a: A) => A) => (m: Map<K, A>) => Op.Option<Map<K, A>>
} = RM.modifyAt as any

export const modifyAt_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K, f: (a: A) => A) => Op.Option<Map<K, A>>
} = RM.modifyAt_ as any

export const partition: CPartition2<URI> = RM.partition as any

export const partition_: Partition2<URI> = RM.partition_ as any

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: Map<E, A>) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap as any

export const partitionMap_: <E, A, B, C>(
  fa: Map<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap_ as any

export const partitionMapWithIndex: <K, A, B, C>(
  f: (k: K, a: A) => Either<B, C>
) => (
  fa: Map<K, A>
) => Separated<Map<K, B>, Map<K, C>> = RM.partitionMapWithIndex as any

export const partitionMapWithIndex_: <K, A, B, C>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Either<B, C>
) => Separated<Map<K, B>, Map<K, C>> = RM.partitionMapWithIndex_ as any

export const partitionWithIndex: <K, A>(
  p: (k: K, a: A) => boolean
) => (fa: Map<K, A>) => Separated<Map<K, A>, Map<K, A>> = RM.partitionWithIndex as any

export const partitionWithIndex_: <K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
) => Separated<Map<K, A>, Map<K, A>> = RM.partitionWithIndex as any

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export const pop: {
  <K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Op.Option<[A, Map<K, A>]>
} = RM.pop as any

export const pop_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Op.Option<[A, Map<K, A>]>
} = RM.pop_ as any

export const separate: <K, A, B>(
  fa: Map<K, Either<A, B>>
) => Separated<Map<K, A>, Map<K, B>> = RM.separate as any

/**
 * Create a map with one key/value pair
 */
export const singleton: {
  <K, A>(k: K, a: A): Map<K, A>
} = RM.singleton as any

/**
 * Calculate the number of key/value pairs in a map
 */
export const size: {
  <K, A>(d: Map<K, A>): number
} = RM.size as any

/**
 * Get a sorted of the key/value pairs contained in a map
 */
export const toArray: {
  <K>(O: Ord<K>): <A>(m: Map<K, A>) => [K, A][]
} = RM.toReadonlyArray as any

/**
 * Unfolds a map into a list of key/value pairs
 */
export const toUnfoldable: {
  <K, F extends URIS>(O: Ord<K>, U: CUnfoldable1<F>): <A>(
    d: Map<K, A>
  ) => Kind<F, [K, A]>
  <K, F>(O: Ord<K>, U: CUnfoldable<F>): <A>(d: Map<K, A>) => HKT<F, [K, A]>
  <K, F>(O: Ord<K>, U: CUnfoldable<F>): <A>(d: Map<K, A>) => HKT<F, [K, A]>
} = RM.toUnfoldable as any

export const updateAt: {
  <K>(E: Eq<K>): <A>(k: K, a: A) => (m: Map<K, A>) => Op.Option<Map<K, A>>
} = RM.updateAt as any

export const updateAt_: {
  <K>(E: Eq<K>): <A>(m: Map<K, A>, k: K, a: A) => Op.Option<Map<K, A>>
} = RM.updateAt_ as any

export const URI = "@matechs/core/Map"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: Map<E, A>
  }
}

/**
 * Get a sorted array of the values contained in a map
 */
export const values: {
  <A>(O: Ord<A>): <K>(m: Map<K, A>) => Array<A>
} = RM.values as any

export const mapFilterable: CFilterable2<URI> = {
  URI,
  map,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap
}
