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
export const empty: <K, V>() => STM.STM<never, never, TMap<K, V>> = internal.empty

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @since 2.0.0
 * @category elements
 */
export const find: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<never, never, Option.Option<A>>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<never, never, Option.Option<A>>
} = internal.find

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @since 2.0.0
 * @category elements
 */
export const findSTM: {
  <K, V, R, E, A>(
    f: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
  ): (self: TMap<K, V>) => STM.STM<R, E, Option.Option<A>>
  <K, V, R, E, A>(
    self: TMap<K, V>,
    f: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
  ): STM.STM<R, E, Option.Option<A>>
} = internal.findSTM

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided function to extract values out them.
 *
 * @since 2.0.0
 * @category elements
 */
export const findAll: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<never, never, Array<A>>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<never, never, Array<A>>
} = internal.findAll

/**
 * Finds all the key/value pairs matching the specified predicate, and uses
 * the provided effectful function to extract values out of them..
 *
 * @since 2.0.0
 * @category elements
 */
export const findAllSTM: {
  <K, V, R, E, A>(
    pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
  ): (self: TMap<K, V>) => STM.STM<R, E, Array<A>>
  <K, V, R, E, A>(self: TMap<K, V>, pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>): STM.STM<R, E, Array<A>>
} = internal.findAllSTM

/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const forEach: {
  <K, V, R, E, _>(f: (key: K, value: V) => STM.STM<R, E, _>): (self: TMap<K, V>) => STM.STM<R, E, void>
  <K, V, R, E, _>(self: TMap<K, V>, f: (key: K, value: V) => STM.STM<R, E, _>): STM.STM<R, E, void>
} = internal.forEach

/**
 * Creates a new `TMap` from an iterable collection of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <K, V>(
  iterable: Iterable<readonly [K, V]>
) => STM.STM<never, never, TMap<K, V>> = internal.fromIterable

/**
 * Retrieves value associated with given key.
 *
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<never, never, Option.Option<V>>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<never, never, Option.Option<V>>
} = internal.get

/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @since 2.0.0
 * @category elements
 */
export const getOrElse: {
  <K, V>(key: K, fallback: LazyArg<V>): (self: TMap<K, V>) => STM.STM<never, never, V>
  <K, V>(self: TMap<K, V>, key: K, fallback: LazyArg<V>): STM.STM<never, never, V>
} = internal.getOrElse

/**
 * Tests whether or not map contains a key.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<never, never, boolean>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<never, never, boolean>
} = internal.has

/**
 * Tests if the map is empty or not.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <K, V>(self: TMap<K, V>) => STM.STM<never, never, boolean> = internal.isEmpty

/**
 * Collects all keys stored in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const keys: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Array<K>> = internal.keys

/**
 * Makes a new `TMap` that is initialized with specified values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <K, V>(...entries: Array<readonly [K, V]>) => STM.STM<never, never, TMap<K, V>> = internal.make

/**
 * If the key is not already associated with a value, stores the provided value,
 * otherwise merge the existing value with the new one using function `f` and
 * store the result.
 *
 * @since 2.0.0
 * @category mutations
 */
export const merge: {
  <K, V>(key: K, value: V, f: (x: V, y: V) => V): (self: TMap<K, V>) => STM.STM<never, never, V>
  <K, V>(self: TMap<K, V>, key: K, value: V, f: (x: V, y: V) => V): STM.STM<never, never, V>
} = internal.merge

/**
 * Atomically folds using a pure function.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, K, V>(zero: Z, f: (acc: Z, value: V, key: K) => Z): (self: TMap<K, V>) => STM.STM<never, never, Z>
  <K, V, Z>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => Z): STM.STM<never, never, Z>
} = internal.reduce

/**
 * Atomically folds using a transactional function.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduceSTM: {
  <Z, V, K, R, E>(zero: Z, f: (acc: Z, value: V, key: K) => STM.STM<R, E, Z>): (self: TMap<K, V>) => STM.STM<R, E, Z>
  <Z, V, K, R, E>(self: TMap<K, V>, zero: Z, f: (acc: Z, value: V, key: K) => STM.STM<R, E, Z>): STM.STM<R, E, Z>
} = internal.reduceSTM

/**
 * Removes binding for given key.
 *
 * @since 2.0.0
 * @category mutations
 */
export const remove: {
  <K>(key: K): <V>(self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K): STM.STM<never, never, void>
} = internal.remove

/**
 * Deletes all entries associated with the specified keys.
 *
 * @since 2.0.0
 * @category mutations
 */
export const removeAll: {
  <K>(keys: Iterable<K>): <V>(self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, keys: Iterable<K>): STM.STM<never, never, void>
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
  ): (self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): (self: TMap<K, V>) => STM.STM<never, never, Array<[K, V]>>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): STM.STM<never, never, void>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): STM.STM<never, never, Array<[K, V]>>
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
  ): (self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): (self: TMap<K, V>) => STM.STM<never, never, Array<[K, V]>>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options: {
      readonly discard: true
    }
  ): STM.STM<never, never, void>
  <K, V>(
    self: TMap<K, V>,
    predicate: (key: K, value: V) => boolean,
    options?: {
      readonly discard: false
    }
  ): STM.STM<never, never, Array<[K, V]>>
} = internal.retainIf

/**
 * Stores new binding into the map.
 *
 * @since 2.0.0
 * @category mutations
 */
export const set: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM.STM<never, never, void>
} = internal.set

/**
 * Stores new binding in the map if it does not already exist.
 *
 * @since 2.0.0
 * @category mutations
 */
export const setIfAbsent: {
  <K, V>(key: K, value: V): (self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, key: K, value: V): STM.STM<never, never, void>
} = internal.setIfAbsent

/**
 * Returns the number of bindings.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <K, V>(self: TMap<K, V>) => STM.STM<never, never, number> = internal.size

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeFirst: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<never, never, A>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<never, never, A>
} = internal.takeFirst

/**
 * Takes the first matching value, or retries until there is one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeFirstSTM: {
  <K, V, R, E, A>(pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>): (self: TMap<K, V>) => STM.STM<R, E, A>
  <K, V, R, E, A>(self: TMap<K, V>, pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>): STM.STM<R, E, A>
} = internal.takeFirstSTM

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeSome: {
  <K, V, A>(pf: (key: K, value: V) => Option.Option<A>): (self: TMap<K, V>) => STM.STM<never, never, [A, ...Array<A>]>
  <K, V, A>(self: TMap<K, V>, pf: (key: K, value: V) => Option.Option<A>): STM.STM<never, never, [A, ...Array<A>]>
} = internal.takeSome

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeSomeSTM: {
  <K, V, R, E, A>(
    pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
  ): (self: TMap<K, V>) => STM.STM<R, E, [A, ...Array<A>]>
  <K, V, R, E, A>(
    self: TMap<K, V>,
    pf: (key: K, value: V) => STM.STM<R, Option.Option<E>, A>
  ): STM.STM<R, E, [A, ...Array<A>]>
} = internal.takeSomeSTM

/**
 * Collects all bindings into a `Chunk`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toChunk: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Chunk.Chunk<[K, V]>> = internal.toChunk

/**
 * Collects all bindings into a `HashMap`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toHashMap: <K, V>(self: TMap<K, V>) => STM.STM<never, never, HashMap.HashMap<K, V>> = internal.toHashMap

/**
 * Collects all bindings into an `Array`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toArray: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Array<[K, V]>> = internal.toArray

/**
 * Collects all bindings into a `Map`.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toMap: <K, V>(self: TMap<K, V>) => STM.STM<never, never, ReadonlyMap<K, V>> = internal.toMap

/**
 * Atomically updates all bindings using a pure function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transform: {
  <K, V>(f: (key: K, value: V) => readonly [K, V]): (self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, f: (key: K, value: V) => readonly [K, V]): STM.STM<never, never, void>
} = internal.transform

/**
 * Atomically updates all bindings using a transactional function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformSTM: {
  <K, V, R, E>(f: (key: K, value: V) => STM.STM<R, E, readonly [K, V]>): (self: TMap<K, V>) => STM.STM<R, E, void>
  <K, V, R, E>(self: TMap<K, V>, f: (key: K, value: V) => STM.STM<R, E, readonly [K, V]>): STM.STM<R, E, void>
} = internal.transformSTM

/**
 * Atomically updates all values using a pure function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformValues: {
  <V>(f: (value: V) => V): <K>(self: TMap<K, V>) => STM.STM<never, never, void>
  <K, V>(self: TMap<K, V>, f: (value: V) => V): STM.STM<never, never, void>
} = internal.transformValues

/**
 * Atomically updates all values using a transactional function.
 *
 * @since 2.0.0
 * @category mutations
 */
export const transformValuesSTM: {
  <V, R, E>(f: (value: V) => STM.STM<R, E, V>): <K>(self: TMap<K, V>) => STM.STM<R, E, void>
  <K, V, R, E>(self: TMap<K, V>, f: (value: V) => STM.STM<R, E, V>): STM.STM<R, E, void>
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
  ): (self: TMap<K, V>) => STM.STM<never, never, Option.Option<V>>
  <K, V>(
    self: TMap<K, V>,
    key: K,
    f: (value: Option.Option<V>) => Option.Option<V>
  ): STM.STM<never, never, Option.Option<V>>
} = internal.updateWith

/**
 * Collects all values stored in map.
 *
 * @since 2.0.0
 * @category elements
 */
export const values: <K, V>(self: TMap<K, V>) => STM.STM<never, never, Array<V>> = internal.values
