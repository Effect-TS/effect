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
