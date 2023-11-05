/**
 * @since 2.0.0
 */

import type { Equal } from "./Equal.js"
import type { HashSet } from "./HashSet.js"
import type { Inspectable } from "./Inspectable.js"
import * as HM from "./internal/hashMap.js"
import * as _keySet from "./internal/hashMap/keySet.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

const TypeId: unique symbol = HM.HashMapTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface HashMap<Key, Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  [TypeId]: TypeId
}

/**
 * @since 2.0.0
 */
export declare namespace HashMap {
  /**
   * @since 2.0.0
   * @category models
   */
  export type UpdateFn<V> = (option: Option<V>) => Option<V>
  /**
   * This type-level utility extracts the key type `K` from a `HashMap<K, V>` type.
   *
   * @example
   * import * as HashMap from "effect/HashMap"
   *
   * declare const hm: HashMap.HashMap<string, number>
   *
   * // $ExpectType string
   * type K = HashMap.HashMap.Key<typeof hm>
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Key<T extends HashMap<any, any>> = [T] extends [HashMap<infer _K, infer _V>] ? _K : never
  /**
   * This type-level utility extracts the value type `V` from a `HashMap<K, V>` type.
   *
   * @example
   * import * as HashMap from "effect/HashMap"
   *
   * declare const hm: HashMap.HashMap<string, number>
   *
   * // $ExpectType number
   * type V = HashMap.HashMap.Value<typeof hm>
   *
   * @since 2.0.0
   * @category type-level
   */
  export type Value<T extends HashMap<any, any>> = [T] extends [HashMap<infer _K, infer _V>] ? _V : never
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isHashMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is HashMap<K, V>
  (u: unknown): u is HashMap<unknown, unknown>
} = HM.isHashMap

/**
 * Creates a new `HashMap`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <K = never, V = never>() => HashMap<K, V> = HM.empty

/**
 * Constructs a new `HashMap` from an array of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Entries extends ReadonlyArray<readonly [any, any]>>(
  ...entries: Entries
) => HashMap<
  Entries[number] extends readonly [infer K, any] ? K : never,
  Entries[number] extends readonly [any, infer V] ? V : never
> = HM.make

/**
 * Constructs a new `HashMap` from an iterable of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <K, V>(entries: Iterable<readonly [K, V]>) => HashMap<K, V> = HM.fromIterable

/**
 * Checks if the `HashMap` contains any entries.
 *
 * @since 2.0.0
 * @category elements
 */
export const isEmpty: <K, V>(self: HashMap<K, V>) => boolean = HM.isEmpty

/**
 * Safely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => Option<V>
  <K, V, K1>(self: HashMap<K, V>, key: K1): Option<V>
} = HM.get

/**
 * Lookup the value for the specified key in the `HashMap` using a custom hash.
 *
 * @since 2.0.0
 * @category elements
 */
export const getHash: {
  <K1>(key: K1, hash: number): <K, V>(self: HashMap<K, V>) => Option<V>
  <K, V, K1>(self: HashMap<K, V>, key: K1, hash: number): Option<V>
} = HM.getHash

/**
 * Unsafely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeGet: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => V
  <K, V, K1>(self: HashMap<K, V>, key: K1): V
} = HM.unsafeGet

/**
 * Checks if the specified key has an entry in the `HashMap`.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K1>(key: K1): <K, V>(self: HashMap<K, V>) => boolean
  <K, V, K1>(self: HashMap<K, V>, key: K1): boolean
} = HM.has

/**
 * Checks if the specified key has an entry in the `HashMap` using a custom
 * hash.
 *
 * @since 2.0.0
 * @category elements
 */
export const hasHash: {
  <K1>(key: K1, hash: number): <K, V>(self: HashMap<K, V>) => boolean
  <K, V, K1>(self: HashMap<K, V>, key: K1, hash: number): boolean
} = HM.hasHash

/**
 * Sets the specified key to the specified value using the internal hashing
 * function.
 *
 * @since 2.0.0
 */
export const set: {
  <K, V>(key: K, value: V): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, value: V): HashMap<K, V>
} = HM.set

/**
 * Returns an `IterableIterator` of the keys within the `HashMap`.
 *
 * @since 2.0.0
 * @category getters
 */
export const keys: <K, V>(self: HashMap<K, V>) => IterableIterator<K> = HM.keys

/**
 * Returns a `HashSet` of keys within the `HashMap`.
 *
 * @since 2.0.0
 * @category getter
 */
export const keySet: <K, V>(self: HashMap<K, V>) => HashSet<K> = _keySet.keySet

/**
 * Returns an `IterableIterator` of the values within the `HashMap`.
 *
 * @since 2.0.0
 * @category getters
 */
export const values: <K, V>(self: HashMap<K, V>) => IterableIterator<V> = HM.values

/**
 * Returns the number of entries within the `HashMap`.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <K, V>(self: HashMap<K, V>) => number = HM.size

/**
 * Marks the `HashMap` as mutable.
 *
 * @since 2.0.0
 */
export const beginMutation: <K, V>(self: HashMap<K, V>) => HashMap<K, V> = HM.beginMutation

/**
 * Marks the `HashMap` as immutable.
 *
 * @since 2.0.0
 */
export const endMutation: <K, V>(self: HashMap<K, V>) => HashMap<K, V> = HM.endMutation

/**
 * Mutates the `HashMap` within the context of the provided function.
 *
 * @since 2.0.0
 */
export const mutate: {
  <K, V>(f: (self: HashMap<K, V>) => void): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, f: (self: HashMap<K, V>) => void): HashMap<K, V>
} = HM.mutate

/**
 * Set or remove the specified key in the `HashMap` using the specified
 * update function. The value of the specified key will be computed using the
 * provided hash.
 *
 * The update function will be invoked with the current value of the key if it
 * exists, or `None` if no such value exists.
 *
 * @since 2.0.0
 */
export const modifyAt: {
  <K, V>(key: K, f: HashMap.UpdateFn<V>): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, f: HashMap.UpdateFn<V>): HashMap<K, V>
} = HM.modifyAt

/**
 * Alter the value of the specified key in the `HashMap` using the specified
 * update function. The value of the specified key will be computed using the
 * provided hash.
 *
 * The update function will be invoked with the current value of the key if it
 * exists, or `None` if no such value exists.
 *
 * This function will always either update or insert a value into the `HashMap`.
 *
 * @since 2.0.0
 */
export const modifyHash: {
  <K, V>(key: K, hash: number, f: HashMap.UpdateFn<V>): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, hash: number, f: HashMap.UpdateFn<V>): HashMap<K, V>
} = HM.modifyHash

/**
 * Updates the value of the specified key within the `HashMap` if it exists.
 *
 * @since 2.0.0
 */
export const modify: {
  <K, V>(key: K, f: (v: V) => V): (self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K, f: (v: V) => V): HashMap<K, V>
} = HM.modify

/**
 * Performs a union of this `HashMap` and that `HashMap`.
 *
 * @since 2.0.0
 */
export const union: {
  <K1, V1>(that: HashMap<K1, V1>): <K0, V0>(self: HashMap<K0, V0>) => HashMap<K1 | K0, V1 | V0>
  <K0, V0, K1, V1>(self: HashMap<K0, V0>, that: HashMap<K1, V1>): HashMap<K0 | K1, V0 | V1>
} = HM.union

/**
 * Remove the entry for the specified key in the `HashMap` using the internal
 * hashing function.
 *
 * @since 2.0.0
 */
export const remove: {
  <K>(key: K): <V>(self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, key: K): HashMap<K, V>
} = HM.remove

/**
 * Removes all entries in the `HashMap` which have the specified keys.
 *
 * @since 2.0.0
 */
export const removeMany: {
  <K>(keys: Iterable<K>): <V>(self: HashMap<K, V>) => HashMap<K, V>
  <K, V>(self: HashMap<K, V>, keys: Iterable<K>): HashMap<K, V>
} = HM.removeMany

/**
 * Maps over the entries of the `HashMap` using the specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, V, K>(f: (value: V, key: K) => A): (self: HashMap<K, V>) => HashMap<K, A>
  <K, V, A>(self: HashMap<K, V>, f: (value: V, key: K) => A): HashMap<K, A>
} = HM.map

/**
 * Chains over the entries of the `HashMap` using the specified function.
 *
 * **NOTE**: the hash and equal of both maps have to be the same.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, K, B>(f: (value: A, key: K) => HashMap<K, B>): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A, B>(self: HashMap<K, A>, f: (value: A, key: K) => HashMap<K, B>): HashMap<K, B>
} = HM.flatMap

/**
 * Applies the specified function to the entries of the `HashMap`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <V, K>(f: (value: V, key: K) => void): (self: HashMap<K, V>) => void
  <V, K>(self: HashMap<K, V>, f: (value: V, key: K) => void): void
} = HM.forEach

/**
 * Reduces the specified state over the entries of the `HashMap`.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: HashMap<K, V>) => Z
  <K, V, Z>(self: HashMap<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
} = HM.reduce

/**
 * Filters entries out of a `HashMap` using the specified predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <K, A, B extends A>(f: (a: A, k: K) => a is B): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A>(f: (a: A, k: K) => boolean): (self: HashMap<K, A>) => HashMap<K, A>
  <K, A, B extends A>(self: HashMap<K, A>, f: (a: A, k: K) => a is B): HashMap<K, B>
  <K, A>(self: HashMap<K, A>, f: (a: A, k: K) => boolean): HashMap<K, A>
} = HM.filter

/**
 * Filters out `None` values from a `HashMap` of `Options`s.
 *
 * @since 2.0.0
 * @category filtering
 */
export const compact: <K, A>(self: HashMap<K, Option<A>>) => HashMap<K, A> = HM.compact

/**
 * Maps over the entries of the `HashMap` using the specified partial function
 * and filters out `None` values.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterMap: {
  <A, K, B>(f: (value: A, key: K) => Option<B>): (self: HashMap<K, A>) => HashMap<K, B>
  <K, A, B>(self: HashMap<K, A>, f: (value: A, key: K) => Option<B>): HashMap<K, B>
} = HM.filterMap

/**
 * Returns the first element that satisfies the specified
 * predicate, or `None` if no such element exists.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirst: {
  <K, A>(predicate: (k: K, a: A) => boolean): (self: HashMap<K, A>) => Option<[K, A]>
  <K, A>(self: HashMap<K, A>, predicate: (k: K, a: A) => boolean): Option<[K, A]>
} = HM.findFirst
