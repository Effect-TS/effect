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
export interface Trie<out Value> extends Iterable<[string, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _Key: Types.Invariant<string>
    readonly _Value: Types.Covariant<Value>
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
  <V>(prefix: string): (self: Trie<V>) => IterableIterator<string>
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
  <V>(prefix: string): (self: Trie<V>) => IterableIterator<V>
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
  <V>(prefix: string): (self: Trie<V>) => IterableIterator<[string, V]>
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
  <V>(prefix: string): (self: Trie<V>) => Array<[string, V]>
  <V>(self: Trie<V>, prefix: string): Array<[string, V]>
} = TR.toEntriesWithPrefix

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
  <V>(key: string): (self: Trie<V>) => Trie<V>
  <V>(self: Trie<V>, key: string): Trie<V>
} = TR.remove
