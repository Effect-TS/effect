/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as TR from "./internal/trie.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Types from "./Types.js"

const TypeId: unique symbol = TR.TrieTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * A Trie.
 *
 * @since 2.0.0
 * @category models
 */
export interface Trie<in out Value> extends Iterable<[string, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _Value: Types.Invariant<Value>
  }
}

/**
 * Creates an empty `Trie`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <V = never>() => Trie<V> = TR.empty

/**
 * Creates a new `Trie` from an iterable collection of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <V>(entries: Iterable<readonly [string, V]>) => Trie<V> = TR.fromIterable

/**
 * Constructs a new `Trie` from the specified entries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Entries extends Array<readonly [string, any]>>(
  ...entries: Entries
) => Trie<Entries[number] extends readonly [any, infer V] ? V : never> = TR.make

/**
 * Creates an empty `Trie`.
 *
 * @since 2.0.0
 */
export const insert: {
  <V>(key: string, value: V): (self: Trie<V>) => Trie<V>
  <V>(self: Trie<V>, key: string, value: V): Trie<V>
} = TR.insert

/**
 * Returns an `IterableIterator` of the keys within the `Trie`.
 *
 * @since 2.0.0
 * @category getters
 */
export const keys: <V>(self: Trie<V>) => IterableIterator<string> = TR.keys

/**
 * Returns an `IterableIterator` of the values within the `Trie`.
 *
 * @since 2.0.0
 * @category getters
 */
export const values: <V>(self: Trie<V>) => IterableIterator<V> = TR.values

/**
 * Returns an `IterableIterator` of the entries within the `Trie`.
 *
 * @since 2.0.0
 * @category getters
 */
export const entries: <V>(self: Trie<V>) => IterableIterator<[string, V]> = TR.entries

/**
 * Returns an `Array<[K, V]>` of the entries within the `Trie`.
 *
 * @since 2.0.0
 * @category getters
 */
export const toEntries = <V>(self: Trie<V>): Array<[string, V]> => Array.from(entries(self))

/**
 * Returns an `IterableIterator` of the keys within the `Trie`
 * that have `prefix` as prefix.
 *
 * @since 2.0.0
 * @category getters
 */
export const keysWithPrefix: {
  (prefix: string): <V>(self: Trie<V>) => IterableIterator<string>
  <V>(self: Trie<V>, prefix: string): IterableIterator<string>
} = TR.keysWithPrefix

/**
 * Returns an `IterableIterator` of the values within the `Trie`
 * that have `prefix` as prefix.
 *
 * @since 2.0.0
 * @category getters
 */
export const valuesWithPrefix: {
  (prefix: string): <V>(self: Trie<V>) => IterableIterator<V>
  <V>(self: Trie<V>, prefix: string): IterableIterator<V>
} = TR.valuesWithPrefix

/**
 * Returns an `IterableIterator` of the entries within the `Trie`
 * that have `prefix` as prefix.
 *
 * @since 2.0.0
 * @category getters
 */
export const entriesWithPrefix: {
  (prefix: string): <V>(self: Trie<V>) => IterableIterator<[string, V]>
  <V>(self: Trie<V>, prefix: string): IterableIterator<[string, V]>
} = TR.entriesWithPrefix

/**
 * Returns `Array<[K, V]>` of the entries within the `Trie`
 * that have `prefix` as prefix.
 *
 * @since 2.0.0
 * @category getters
 */
export const toEntriesWithPrefix: {
  (prefix: string): <V>(self: Trie<V>) => Array<[string, V]>
  <V>(self: Trie<V>, prefix: string): Array<[string, V]>
} = TR.toEntriesWithPrefix

/**
 * Returns the longest key and value in the `Trie`
 * that is a prefix of that `key`
 *
 * @since 2.0.0
 * @category getters
 */
export const longestPrefixOf: {
  (key: string): <V>(self: Trie<V>) => Option<[string, V]>
  <V>(self: Trie<V>, key: string): Option<[string, V]>
} = TR.longestPrefixOf

/**
 * Returns the size of the tree.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <V>(self: Trie<V>) => number = TR.size

/**
 * Safely lookup the value for the specified key in the `Trie`.
 *
 * @since 2.0.0
 * @category elements
 */
export const get: {
  (key: string): <V>(self: Trie<V>) => Option<V>
  <V>(self: Trie<V>, key: string): Option<V>
} = TR.get

/**
 * Finds the item with key, if it exists.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  (key: string): <V>(self: Trie<V>) => boolean
  <V>(self: Trie<V>, key: string): boolean
} = TR.has

/**
 * Checks if the `Trie` contains any entries.
 *
 * @since 2.0.0
 * @category elements
 */
export const isEmpty: <V>(self: Trie<V>) => boolean = TR.isEmpty

/**
 * Unsafely lookup the value for the specified key in the `Trie`.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeGet: {
  (key: string): <V>(self: Trie<V>) => V
  <V>(self: Trie<V>, key: string): V
} = TR.unsafeGet

/**
 * Remove the entry for the specified key in the `Trie`.
 *
 * @since 2.0.0
 */
export const remove: {
  (key: string): <V>(self: Trie<V>) => Trie<V>
  <V>(self: Trie<V>, key: string): Trie<V>
} = TR.remove

/**
 * Reduce a state over the entries of the tree.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, V>(zero: Z, f: (accumulator: Z, value: V, key: string) => Z): (self: Trie<V>) => Z
  <Z, V>(self: Trie<V>, zero: Z, f: (accumulator: Z, value: V, key: string) => Z): Z
} = TR.reduce

/**
 * Maps over the entries of the `Trie` using the specified function.
 *
 * @since 2.0.0
 * @category folding
 */
export const map: {
  <A, V>(f: (value: V, key: string) => A): (self: Trie<V>) => Trie<A>
  <V, A>(self: Trie<V>, f: (value: V, key: string) => A): Trie<A>
} = TR.map

/**
 * Filters entries out of a `Trie` using the specified predicate.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <A, B extends A>(f: (a: A, k: string) => a is B): (self: Trie<A>) => Trie<B>
  <B extends A, A = B>(f: (a: A, k: string) => boolean): (self: Trie<B>) => Trie<B>
  <A, B extends A>(self: Trie<A>, f: (a: A, k: string) => a is B): Trie<B>
  <A>(self: Trie<A>, f: (a: A, k: string) => boolean): Trie<A>
} = TR.filter

/**
 * Applies the specified function to the entries of the `Trie`.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <V>(f: (value: V, key: string) => void): (self: Trie<V>) => void
  <V>(self: Trie<V>, f: (value: V, key: string) => void): void
} = TR.forEach
