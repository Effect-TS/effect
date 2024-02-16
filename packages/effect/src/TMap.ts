/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk.js"
import type { LazyArg } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import * as internal from "./internal/stm/tMap.js"
import type * as Option from "./Option.js"
import type * as STM from "./STM.js"
import type * as TArray from "./TArray.js"
import type * as TRef from "./TRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TMapTypeId: unique symbol = internal.TMapTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TMapTypeId = typeof TMapTypeId

/**
 * Transactional map implemented on top of `TRef` and `TArray`. Resolves
 * conflicts via chaining.
 *
 * @since 2.0.0
 * @category models
 */
export interface TMap<in out K, in out V> extends TMap.Variance<K, V> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TMap<in out K, in out V> {
  /** @internal */
  readonly tBuckets: TRef.TRef<TArray.TArray<Chunk.Chunk<readonly [K, V]>>>
  /** @internal */
  readonly tSize: TRef.TRef<number>
}

/**
 * @since 2.0.0
 */
export declare namespace TMap {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out K, in out V> {
    readonly [TMapTypeId]: {
      readonly _K: Types.Invariant<K>
      readonly _V: Types.Invariant<V>
    }
  }
}

/**
 * Makes an empty `TMap`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <K, V>() => STM.STM<TMap<K, V>> = internal.empty

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @since 2.0.0
 * @category elements
 */
export const find: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<Option.Option<A>>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<Option.Option<A>>
} = internal.find

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @since 2.0.0
 * @category elements
 */
export const findSTM: {
  <K, V, A, E, R>(
    f: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>
  ): (self: TMap<K, V>) => STM.STM<Option.Option<A>, E, R>
  <K, V, A, E, R>(
    self: TMap<K, V>,
    f: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>
  ): STM.STM<Option.Option<A>, E, R>
} = internal.findSTM

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @since 2.0.0
 * @category elements
 */
export const findAll: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<Array<A>>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<Array<A>>
} = internal.findAll

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @since 2.0.0
 * @category elements
 */
export const findAllSTM: {
  <K, V, A, E, R>(
    pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>
  ): (self: TMap<K, V>) => STM.STM<Array<A>, E, R>
  <K, V, A, E, R>(self: TMap<K, V>, pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>): STM.STM<Array<A>, E, R>
} = internal.findAllSTM

/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const forEach: {
  <K, V, X, E, R>(f: (key: K, value: V) => STM.STM<X, E, R>): (self: TMap<K, V>) => STM.STM<void, E, R>
  <K, V, X, E, R>(self: TMap<K, V>, f: (key: K, value: V) => STM.STM<X, E, R>): STM.STM<void, E, R>
} = internal.forEach

/**
 * Creates a new `TMap` from an iterable collection of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <K, V>(
  iterable: Iterable<readonly [K, V]>
) => STM.STM<TMap<K, V>> = internal.fromIterable

/**
 * Retrieves value associated with given key.
 *
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<Option.Option<V>>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<Option.Option<V>>
} = internal.get

/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @since 2.0.0
 * @category elements
 */
export const getOrElse: {
  <K, V>(key: K, fallback: LazyArg<V>): (self: TMap<K, V>) => STM.STM<V>
  <K, V>(self: TMap<K, V>, key: K, fallback: LazyArg<V>): STM.STM<V>
} = internal.getOrElse

/**
 * Tests whether or not map contains a key.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<boolean>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<boolean>
} = internal.has

/**
 * Tests if the map is empty or not.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <K, V>(self: TMap<K, V>) => STM.STM<boolean> = internal.isEmpty

/**
 * Collects all keys stored in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const keys: <K, V>(self: TMap<K, V>) => STM.STM<Array<K>> = internal.keys

/**
 * Makes a new `TMap` that is initialized with specified values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <K, V>(...entries: Array<readonly [K, V]>) => STM.STM<TMap<K, V>> = internal.make

/**
 * If the key is not already associated with a value, stores the provided value,
 * otherwise merge the existing value with the new one using function `f` and
 * store the result.
 *
 * @since 2.0.0
 * @category mutations
 */
export const merge: {
  <K, V>(key: K, value: V, f: (x: V, y: V) => V): (self: TMap<K, V>) => STM.STM<V>
  <K, V>(self: TMap<K, V>, key: K, value: V, f: (x: V, y: V) => V): STM.STM<V>
} = internal.merge

/**
 * Atomically folds using a pure function.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, K, V>(zero: Z, f: (acc: Z, value: V, key: K) => Z): (self: TMap<K, V>) => STM.STM<Z>
  <K, V, Z>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => Z): STM.STM<Z>
} = internal.reduce

/**
 * Atomically folds using a transactional function.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduceSTM: {
  <Z, V, K, R, E>(zero: Z, f: (acc: Z, value: V, key: K) => STM.STM<Z, E, R>): (self: TMap<K, V>) => STM.STM<Z, E, R>
  <Z, V, K, R, E>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => STM.STM<Z, E, R>): STM.STM<Z, E, R>
} = internal.reduceSTM

/**
 * Removes binding for given key.
 *
 * @since 2.0.0
 * @category mutations
 */
export const remove: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<void>
} = internal.remove

/**
 * Deletes all entries associated with the specified keys.
 *
 * @since 2.0.0
 * @category mutations
 */
export const removeAll: {
  <K>(keys: Iterable<K>): <V>(self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, keys: Iterable<K>): STM.STM<void>
} = internal.removeAll

/**
 * Removes entries from a `TMap` that satisfy the specified predicate and returns the removed entries
 * (or `void` if `discard = true`).
 *
 * @since 2.0.0
 * @category mutations
 */
export const removeIf: {
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): (self: TMap<K, V>) => STM.STM<void>
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): (self: TMap<K, V>) => STM.STM<Array<[K, V]>>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): STM.STM<void>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): STM.STM<Array<[K, V]>>
} = internal.removeIf

/**
 * Retains entries in a `TMap` that satisfy the specified predicate and returns the removed entries
 * (or `void` if `discard = true`).
 *
 * @since 2.0.0
 * @category mutations
 */
export const retainIf: {
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): (self: TMap<K, V>) => STM.STM<void>
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): (self: TMap<K, V>) => STM.STM<Array<[K, V]>>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): STM.STM<void>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): STM.STM<Array<[K, V]>>
} = internal.retainIf

/**
 * Stores new binding into the map.
 *
 * @since 2.0.0
 * @category mutations
 */
export const set: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM.STM<void>
} = internal.set

/**
 * Stores new binding in the map if it does not already exist.
 *
 * @since 2.0.0
 * @category mutations
 */
export const setIfAbsent: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM.STM<void>
} = internal.setIfAbsent

/**
 * Returns the number of bindings.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <K, V>(self: TMap<K, V>) => STM.STM<number> = internal.size

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeFirst: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<A>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<A>
} = internal.takeFirst

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeFirstSTM: {
  <K, V, A, E, R>(pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>): (self: TMap<K, V>) => STM.STM<A, E, R>
  <K, V, A, E, R>(self: TMap<K, V>, pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>): STM.STM<A, E, R>
} = internal.takeFirstSTM

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeSome: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<[A, ...Array<A>]>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<[A, ...Array<A>]>
} = internal.takeSome

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeSomeSTM: {
  <K, V, A, E, R>(
    pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>
  ): (self: TMap<K, V>) => STM.STM<[A, ...Array<A>], E, R>
  <K, V, A, E, R>(
    self: TMap<K, V>,
    pf: (key: K, value: V) => STM.STM<A, Option.Option<E>, R>
  ): STM.STM<[A, ...Array<A>], E, R>
} = internal.takeSomeSTM

/**
 * Collects all bindings into a `Chunk`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toChunk: <K, V>(self: TMap<K, V>) => STM.STM<Chunk.Chunk<[K, V]>> = internal.toChunk

/**
 * Collects all bindings into a `HashMap`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toHashMap: <K, V>(self: TMap<K, V>) => STM.STM<HashMap.HashMap<K, V>> = internal.toHashMap

/**
 * Collects all bindings into an `Array`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toArray: <K, V>(self: TMap<K, V>) => STM.STM<Array<[K, V]>> = internal.toArray

/**
 * Collects all bindings into a `Map`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toMap: <K, V>(self: TMap<K, V>) => STM.STM<ReadonlyMap<K, V>> = internal.toMap

/**
 * Atomically updates all bindings using a pure function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transform: {
  <K, V>(f: (key: K, value: V) => readonly [K, V]): (self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, f: (key: K, value: V) => readonly [K, V]): STM.STM<void>
} = internal.transform

/**
 * Atomically updates all bindings using a transactional function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformSTM: {
  <K, V, R, E>(f: (key: K, value: V) => STM.STM<readonly [K, V], E, R>): (self: TMap<K, V>) => STM.STM<void, E, R>
  <K, V, R, E>(self: TMap<K, V>, f: (key: K, value: V) => STM.STM<readonly [K, V], E, R>): STM.STM<void, E, R>
} = internal.transformSTM

/**
 * Atomically updates all values using a pure function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformValues: {
  <V>(f: (value: V) => V): <K>(self: TMap<K, V>) => STM.STM<void>
  <K, V>(self: TMap<K, V>, f: (value: V) => V): STM.STM<void>
} = internal.transformValues

/**
 * Atomically updates all values using a transactional function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformValuesSTM: {
  <V, R, E>(f: (value: V) => STM.STM<V, E, R>): <K>(self: TMap<K, V>) => STM.STM<void, E, R>
  <K, V, R, E>(self: TMap<K, V>, f: (value: V) => STM.STM<V, E, R>): STM.STM<void, E, R>
} = internal.transformValuesSTM

/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @since 2.0.0
 * @category mutations
 */
export const updateWith: {
  <K, V>(
    key: K,
    f: (value: Option.Option<V>) => Option.Option<V>
  ): (self: TMap<K, V>) => STM.STM<Option.Option<V>>
  <K, V>(
    self: TMap<K, V>,
    key: K,
    f: (value: Option.Option<V>) => Option.Option<V>
  ): STM.STM<Option.Option<V>>
} = internal.updateWith

/**
 * Collects all values stored in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const values: <K, V>(self: TMap<K, V>) => STM.STM<Array<V>> = internal.values
