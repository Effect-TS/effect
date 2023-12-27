/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import * as RBT from "./internal/redBlackTree.js"
import * as RBTI from "./internal/redBlackTree/iterator.js"
import type { Option } from "./Option.js"
import type { Order } from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Types from "./Types.js"

const TypeId: unique symbol = RBT.RedBlackTreeTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category constants
 */
export const Direction = RBTI.Direction

/**
 * A Red-Black Tree.
 *
 * @since 2.0.0
 * @category models
 */
export interface RedBlackTree<in out Key, out Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _Key: Types.Invariant<Key>
    readonly _Value: Types.Covariant<Value>
  }
}

/**
 * @since 2.0.0
 */
export declare namespace RedBlackTree {
  /**
   * @since 2.0.0
   */
  export type Direction = number & {
    readonly Direction: unique symbol
  }
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isRedBlackTree: {
  <K, V>(u: Iterable<readonly [K, V]>): u is RedBlackTree<K, V>
  (u: unknown): u is RedBlackTree<unknown, unknown>
} = RBT.isRedBlackTree

/**
 * Creates an empty `RedBlackTree`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <K, V = never>(ord: Order<K>) => RedBlackTree<K, V> = RBT.empty

/**
 * Creates a new `RedBlackTree` from an iterable collection of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: {
  <B>(ord: Order<B>): <K extends B, V>(entries: Iterable<readonly [K, V]>) => RedBlackTree<K, V>
  <K extends B, V, B>(entries: Iterable<readonly [K, V]>, ord: Order<B>): RedBlackTree<K, V>
} = RBT.fromIterable

/**
 * Constructs a new `RedBlackTree` from the specified entries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <K>(
  ord: Order<K>
) => <Entries extends Array<readonly [K, any]>>(
  ...entries: Entries
) => RedBlackTree<K, Entries[number] extends readonly [any, infer V] ? V : never> = RBT.make

/**
 * Returns an iterator that points to the element at the specified index of the
 * tree.
 *
 * **Note**: The iterator will run through elements in order.
 *
 * @since 2.0.0
 * @category traversing
 */
export const at: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
} = RBT.atForwards

/**
 * Returns an iterator that points to the element at the specified index of the
 * tree.
 *
 * **Note**: The iterator will run through elements in reverse order.
 *
 * @since 2.0.0
 * @category traversing
 */
export const atReversed: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
} = RBT.atBackwards

/**
 * Finds all values in the tree associated with the specified key.
 *
 * @since 2.0.0
 * @category elements
 */
export const findAll: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Chunk<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Chunk<V>
} = RBT.findAll

/**
 * Finds the first value in the tree associated with the specified key, if it exists.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirst: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Option<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Option<V>
} = RBT.findFirst

/**
 * Returns the first entry in the tree, if it exists.
 *
 * @since 2.0.0
 * @category getters
 */
export const first: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]> = RBT.first

/**
 * Returns the element at the specified index within the tree or `None` if the
 * specified index does not exist.
 *
 * @since 2.0.0
 * @category elements
 */
export const getAt: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Option<[K, V]>
} = RBT.getAt

/**
 * Gets the `Order<K>` that the `RedBlackTree<K, V>` is using.
 *
 * @since 2.0.0
 * @category getters
 */
export const getOrder: <K, V>(self: RedBlackTree<K, V>) => Order<K> = RBT.getOrder

/**
 * Returns an iterator that traverse entries in order with keys greater than the
 * specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const greaterThan: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanForwards

/**
 * Returns an iterator that traverse entries in reverse order with keys greater
 * than the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const greaterThanReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanBackwards

/**
 * Returns an iterator that traverse entries in order with keys greater than or
 * equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const greaterThanEqual: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanEqualForwards

/**
 * Returns an iterator that traverse entries in reverse order with keys greater
 * than or equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const greaterThanEqualReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanEqualBackwards

/**
 * Finds the item with key, if it exists.
 *
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => boolean
  <K, V>(self: RedBlackTree<K, V>, key: K): boolean
} = RBT.has

/**
 * Insert a new item into the tree.
 *
 * @since 2.0.0
 */
export const insert: {
  <K, V>(key: K, value: V): (self: RedBlackTree<K, V>) => RedBlackTree<K, V>
  <K, V>(self: RedBlackTree<K, V>, key: K, value: V): RedBlackTree<K, V>
} = RBT.insert

/**
 * Get all the keys present in the tree in order.
 *
 * @since 2.0.0
 * @category getters
 */
export const keys: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K> = RBT.keysForward

/**
 * Get all the keys present in the tree in reverse order.
 *
 * @since 2.0.0
 * @category getters
 */
export const keysReversed: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K> = RBT.keysBackward

/**
 * Returns the last entry in the tree, if it exists.
 *
 * @since 2.0.0
 * @category getters
 */
export const last: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]> = RBT.last

/**
 * Returns an iterator that traverse entries in order with keys less than the
 * specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const lessThan: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.lessThanForwards

/**
 * Returns an iterator that traverse entries in reverse order with keys less
 * than the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const lessThanReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.lessThanBackwards

/**
 * Returns an iterator that traverse entries in order with keys less than or
 * equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const lessThanEqual: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.lessThanEqualForwards

/**
 * Returns an iterator that traverse entries in reverse order with keys less
 * than or equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 */
export const lessThanEqualReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.lessThanEqualBackwards

/**
 * Execute the specified function for each node of the tree, in order.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEach: {
  <K, V>(f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, f: (key: K, value: V) => void): void
} = RBT.forEach

/**
 * Visit each node of the tree in order with key greater then or equal to max.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEachGreaterThanEqual: {
  <K, V>(min: K, f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, min: K, f: (key: K, value: V) => void): void
} = RBT.forEachGreaterThanEqual

/**
 * Visit each node of the tree in order with key lower then max.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEachLessThan: {
  <K, V>(max: K, f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, max: K, f: (key: K, value: V) => void): void
} = RBT.forEachLessThan

/**
 * Visit each node of the tree in order with key lower than max and greater
 * than or equal to min.
 *
 * @since 2.0.0
 * @category traversing
 */
export const forEachBetween: {
  <K, V>(
    options: {
      readonly min: K
      readonly max: K
      readonly body: (key: K, value: V) => void
    }
  ): (self: RedBlackTree<K, V>) => void
  <K, V>(
    self: RedBlackTree<K, V>,
    options: {
      readonly min: K
      readonly max: K
      readonly body: (key: K, value: V) => void
    }
  ): void
} = RBT.forEachBetween

/**
 * Reduce a state over the entries of the tree.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: RedBlackTree<K, V>) => Z
  <Z, V, K>(self: RedBlackTree<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
} = RBT.reduce

/**
 * Removes the entry with the specified key, if it exists.
 *
 * @since 2.0.0
 */
export const removeFirst: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => RedBlackTree<K, V>
  <K, V>(self: RedBlackTree<K, V>, key: K): RedBlackTree<K, V>
} = RBT.removeFirst

/**
 * Traverse the tree in reverse order.
 *
 * @since 2.0.0
 * @category traversing
 */
export const reversed: <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]> = RBT.reversed

/**
 * Returns the size of the tree.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <K, V>(self: RedBlackTree<K, V>) => number = RBT.size

/**
 * Get all values present in the tree in order.
 *
 * @since 2.0.0
 * @category getters
 */
export const values: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<V> = RBT.valuesForward

/**
 * Get all values present in the tree in reverse order.
 *
 * @since 2.0.0
 * @category getters
 */
export const valuesReversed: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<V> = RBT.valuesBackward
