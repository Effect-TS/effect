/**
 * @since 2.0.0
 */

import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as IM from "./internal/indexMap.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

const TypeId: unique symbol = IM.IndexMapTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * An `IndexMap` is a hash table where the iteration order of key-value pairs
 * is independent of the hash values of the keys and follows insertion order.
 *
 * It maintains both key-to-value mappings and the order in which entries
 * were inserted, allowing predictable iteration order across operations.
 *
 * @since 2.0.0
 * @category models
 */
export interface IndexMap<out Key, out Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}

/**
 * @since 2.0.0
 */
export declare namespace IndexMap {
  /**
   * This type-level utility extracts the key type `K` from a `IndexMap<K, V>` type.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Key<T extends IndexMap<any, any>> = [T] extends [IndexMap<infer _K, infer _V>] ? _K : never

  /**
   * This type-level utility extracts the value type `V` from a `IndexMap<K, V>` type.
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Value<T extends IndexMap<any, any>> = [T] extends [IndexMap<infer _K, infer _V>] ? _V : never

  /**
   * The update function signature for updating values in the `IndexMap`.
   *
   * @since 2.0.0
   * @category models
   */
  export interface UpdateFn<A> {
    (option: Option<A>): Option<A>
  }
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isIndexMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is IndexMap<K, V>
  (u: unknown): u is IndexMap<unknown, unknown>
} = IM.isIndexMap

/**
 * Creates a new empty `IndexMap`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <K = never, V = never>() => IndexMap<K, V> = IM.empty

/**
 * Constructs a new `IndexMap` from an array of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Entries extends ReadonlyArray<readonly [any, any]>>(
  ...entries: Entries
) => IndexMap<
  Entries[number] extends readonly [infer K, any] ? K : never,
  Entries[number] extends readonly [any, infer V] ? V : never
> = IM.make

/**
 * Constructs a new `IndexMap` from an iterable of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <K, V>(entries: Iterable<readonly [K, V]>) => IndexMap<K, V> = IM.fromIterable

/**
 * Checks if the `IndexMap` contains any entries.
 *
 * @since 2.0.0
 * @category elements
 */
export const isEmpty: <K, V>(self: IndexMap<K, V>) => boolean = IM.isEmpty

/**
 * Gets the number of entries in the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const size: <K, V>(self: IndexMap<K, V>) => number = IM.size

/**
 * Safely lookup the value for the specified key in the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K1>(key: K1): <K, V>(self: IndexMap<K, V>) => Option<V>
  <K, V, K1>(self: IndexMap<K, V>, key: K1): Option<V>
} = IM.get

/**
 * Gets the value for the specified key from the `IndexMap` or throws if the key doesn't exist.
 *
 * @since 2.0.0
 * @category elements
 */
export const unsafeGet: {
  <K1>(key: K1): <K, V>(self: IndexMap<K, V>) => V
  <K, V, K1>(self: IndexMap<K, V>, key: K1): V
} = IM.unsafeGet

/**
 * Checks if the specified key exists in the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K1>(key: K1): <K, V>(self: IndexMap<K, V>) => boolean
  <K, V, K1>(self: IndexMap<K, V>, key: K1): boolean
} = IM.has

/**
 * Sets the value for the specified key in the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const set: {
  <K, V>(key: K, value: V): (self: IndexMap<K, V>) => IndexMap<K, V>
  <K, V>(self: IndexMap<K, V>, key: K, value: V): IndexMap<K, V>
} = IM.set

/**
 * Gets the key-value pair at the specified index in the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const getIndex: {
  (index: number): <K, V>(self: IndexMap<K, V>) => Option<[K, V]>
  <K, V>(self: IndexMap<K, V>, index: number): Option<[K, V]>
} = IM.getIndex

/**
 * Removes the entry with the specified key from the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const remove: {
  <K>(key: K): <V>(self: IndexMap<K, V>) => IndexMap<K, V>
  <K, V>(self: IndexMap<K, V>, key: K): IndexMap<K, V>
} = IM.remove

/**
 * Removes and returns the last key-value pair from the `IndexMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const pop: <K, V>(self: IndexMap<K, V>) => Option<[[K, V], IndexMap<K, V>]> = IM.pop

/**
 * Prepares the `IndexMap` to be modified.
 *
 * @since 2.0.0
 * @category mutations
 */
export const beginMutation: <K, V>(self: IndexMap<K, V>) => IndexMap<K, V> = IM.beginMutation

/**
 * Finalizes mutations to the `IndexMap`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const endMutation: <K, V>(self: IndexMap<K, V>) => IndexMap<K, V> = IM.endMutation

/**
 * Applies a function to a mutable copy of the `IndexMap` and returns a new immutable version.
 *
 * @since 2.0.0
 * @category mutations
 */
export const mutate: {
  <K, V>(f: (self: IndexMap<K, V>) => void): (self: IndexMap<K, V>) => IndexMap<K, V>
  <K, V>(self: IndexMap<K, V>, f: (self: IndexMap<K, V>) => void): IndexMap<K, V>
} = IM.mutate

/**
 * Applies a function to each entry in the `IndexMap`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <V, K>(f: (value: V, key: K) => void): (self: IndexMap<K, V>) => void
  <V, K>(self: IndexMap<K, V>, f: (value: V, key: K) => void): void
} = IM.forEach

/**
 * Reduces the entries of the `IndexMap` to a single value using the specified function.
 *
 * @since 2.0.0
 * @category traversing
 */
export const reduce: {
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: IndexMap<K, V>) => Z
  <Z, V, K>(self: IndexMap<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
} = IM.reduce

/**
 * Returns an iterator of all keys in the `IndexMap`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const keys: <K, V>(self: IndexMap<K, V>) => IterableIterator<K> = IM.keys

/**
 * Returns an iterator of all values in the `IndexMap`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const values: <K, V>(self: IndexMap<K, V>) => IterableIterator<V> = IM.values

/**
 * Returns an iterator of all entries in the `IndexMap`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const entries: <K, V>(self: IndexMap<K, V>) => IterableIterator<[K, V]> = IM.entries

/**
 * Finds the first entry in the `IndexMap` that satisfies the predicate.
 *
 * @since 2.0.0
 * @category traversing
 */
export const findFirst: {
  <K, A, B extends A>(predicate: (a: A, k: K) => a is B): (self: IndexMap<K, A>) => Option<[K, B]>
  <K, A>(predicate: (a: A, k: K) => boolean): (self: IndexMap<K, A>) => Option<[K, A]>
  <K, A, B extends A>(self: IndexMap<K, A>, predicate: (a: A, k: K) => a is B): Option<[K, B]>
  <K, A>(self: IndexMap<K, A>, predicate: (a: A, k: K) => boolean): Option<[K, A]>
} = IM.findFirst

/**
 * Filters the entries of the `IndexMap` using the specified predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <K, A, B extends A>(f: (a: A, k: K) => a is B): (self: IndexMap<K, A>) => IndexMap<K, B>
  <K, A>(f: (a: A, k: K) => boolean): (self: IndexMap<K, A>) => IndexMap<K, A>
  <K, A, B extends A>(self: IndexMap<K, A>, f: (a: A, k: K) => a is B): IndexMap<K, B>
  <K, A>(self: IndexMap<K, A>, f: (a: A, k: K) => boolean): IndexMap<K, A>
} = IM.filter

/**
 * Maps each value in the `IndexMap` to a new value using the specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, V, K>(f: (value: V, key: K) => A): (self: IndexMap<K, V>) => IndexMap<K, A>
  <K, V, A>(self: IndexMap<K, V>, f: (value: V, key: K) => A): IndexMap<K, A>
} = IM.map
