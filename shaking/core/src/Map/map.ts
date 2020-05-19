import type {
  Separated,
  Filter2,
  URIS3,
  Foldable3,
  Kind3,
  URIS2,
  Foldable2,
  Kind2,
  URIS,
  Foldable1,
  Kind,
  Foldable,
  HKT,
  FilterableWithIndex2C,
  Witherable2C,
  TraversableWithIndex2C,
  Partition2,
  Unfoldable1,
  Unfoldable,
  Filterable2
} from "../Base"
import type { Either } from "../Either"
import type { Eq } from "../Eq"
import type { Predicate, Refinement } from "../Function"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import type { Option } from "../Option"
import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export const collect: <K>(
  O: Ord<K>
) => <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>) => Array<B> = RM.collect as any

export const compact: <E, A>(fa: Map<E, Option<A>>) => Map<E, A> = RM.compact as any

/**
 * Delete a key and value from a map
 */
export const deleteAt: <K>(
  E: Eq<K>
) => (k: K) => <A>(m: Map<K, A>) => Map<K, A> = RM.deleteAt as any

/**
 * Test whether or not a value is a member of a map
 */
export const elem: <A>(E: Eq<A>) => <K>(a: A, m: Map<K, A>) => boolean = RM.elem

export const empty =
  /*#__PURE__*/
  (() => new Map<never, never>())()

export const filter_: Filter2<URI> = RM.filter_ as any

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Map<E, A>) => Map<E, B>
  <A>(predicate: Predicate<A>): <E>(fa: Map<E, A>) => Map<E, A>
} = RM.filter as any

export const filterMap_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Option<B>
) => Map<E, B> = RM.filterMap_ as any

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.filterMap as any

/**
 * Create a map from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export function fromFoldable<F extends URIS3, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: Foldable3<F>
): <R, E>(fka: Kind3<F, R, E, [K, A]>) => Map<K, A>
export function fromFoldable<F extends URIS2, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: Foldable2<F>
): <E>(fka: Kind2<F, E, [K, A]>) => Map<K, A>
export function fromFoldable<F extends URIS, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: Foldable1<F>
): (fka: Kind<F, [K, A]>) => Map<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: Foldable<F>
): (fka: HKT<F, [K, A]>) => Map<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: Foldable<F>
): (fka: HKT<F, [K, A]>) => Map<K, A> {
  return RM.fromFoldable(E, M, F) as any
}

export const getEq: <K, A>(SK: Eq<K>, SA: Eq<A>) => Eq<Map<K, A>> = RM.getEq

export const getFilterableWithIndex: <K = never>() => FilterableWithIndex2C<
  URI,
  K,
  K
> = RM.getFilterableWithIndex as any

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 */
export const getMonoid: <K, A>(
  SK: Eq<K>,
  SA: Semigroup<A>
) => Monoid<Map<K, A>> = RM.getMonoid as any

export const getShow: <K, A>(SK: Show<K>, SA: Show<A>) => Show<Map<K, A>> = RM.getShow

export const getWitherable: <K>(
  O: Ord<K>
) => Witherable2C<URI, K> & TraversableWithIndex2C<URI, K, K> = RM.getWitherable as any

/**
 * Insert or replace a key/value pair in a map
 */
export const insertAt: <K>(
  E: Eq<K>
) => <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A> = RM.insertAt as any

/**
 * Test whether or not a map is empty
 */
export const isEmpty: <K, A>(d: Map<K, A>) => boolean = RM.isEmpty

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 */
export const isSubmap: <K, A>(
  SK: Eq<K>,
  SA: Eq<A>
) => (d1: Map<K, A>, d2: Map<K, A>) => boolean = RM.isSubmap

/**
 * Get a sorted array of the keys contained in a map
 */
export const keys: <K>(O: Ord<K>) => <A>(m: Map<K, A>) => Array<K> = RM.keys as any

/**
 * Lookup the value for a key in a `Map`.
 */
export const lookup: <K>(E: Eq<K>) => <A>(k: K, m: Map<K, A>) => Option<A> = RM.lookup

/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 */
export const lookupWithKey: <K>(
  E: Eq<K>
) => <A>(k: K, m: Map<K, A>) => Option<[K, A]> = RM.lookupWithKey as any

export const map_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => B
) => Map<E, B> = RM.map_ as any

export const map: <A, B>(
  f: (a: A) => B
) => <E>(fa: Map<E, A>) => Map<E, B> = RM.map as any

/**
 * Test whether or not a key exists in a map
 */
export const member: <K>(E: Eq<K>) => <A>(k: K, m: Map<K, A>) => boolean = RM.member

export const modifyAt: <K>(
  E: Eq<K>
) => <A>(
  k: K,
  f: (a: A) => A
) => (m: Map<K, A>) => Option<Map<K, A>> = RM.modifyAt as any

export const partition_: Partition2<URI> = RM.partition_ as any

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(
    fa: Map<E, A>
  ) => Separated<Map<E, A>, Map<E, B>>
  <A>(predicate: Predicate<A>): <E>(fa: Map<E, A>) => Separated<Map<E, A>, Map<E, A>>
} = RM.partition as any

export const partitionMap_: <E, A, B, C>(
  fa: Map<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap_ as any

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: Map<E, A>) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap as any

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export const pop: <K>(
  E: Eq<K>
) => (k: K) => <A>(m: Map<K, A>) => Option<[A, Map<K, A>]> = RM.pop as any

export const separate: <E, A, B>(
  fa: Map<E, Either<A, B>>
) => Separated<Map<E, A>, Map<E, B>> = RM.separate as any

/**
 * Create a map with one key/value pair
 */
export const singleton: <K, A>(k: K, a: A) => Map<K, A> = RM.singleton as any

/**
 * Calculate the number of key/value pairs in a map
 */
export const size: <K, A>(d: Map<K, A>) => number = RM.size

/**
 * Get a sorted of the key/value pairs contained in a map
 */
export const toArray: <K>(
  O: Ord<K>
) => <A>(m: Map<K, A>) => Array<[K, A]> = RM.toReadonlyArray as any

/**
 * Unfolds a map into a list of key/value pairs
 */
export function toUnfoldable<K, F extends URIS>(
  O: Ord<K>,
  U: Unfoldable1<F>
): <A>(d: Map<K, A>) => Kind<F, [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: Unfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, [K, A]> {
  return RM.toUnfoldable(O, U) as any
}

export const updateAt: <K>(
  E: Eq<K>
) => <A>(k: K, a: A) => (m: Map<K, A>) => Option<Map<K, A>> = RM.updateAt as any

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
export const values: <A>(O: Ord<A>) => <K>(m: Map<K, A>) => Array<A> = RM.values as any

export const mapF: Filterable2<URI> = {
  URI,
  map: map_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_
}
