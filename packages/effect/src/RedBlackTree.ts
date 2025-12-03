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

// ✅ behaves as intuitively expected
/**
 * Creates an empty `RedBlackTree`.
 *
 * @since 2.0.0
 * @category constructors
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * // value type is manually specified
 * const RBT = RedBlackTree.empty<
 *   number, // Key type
 *   string // Value type
 * >(Order.number)
 *
 * console.log(RBT)
 * //          ^ type is RedBlackTree<number, string>
 * // outputs { _id: "RedBlackTree", values: [] }
 *
 * // key type was inferred from Order
 * const RBT2 = RedBlackTree.empty(Order.string)
 * //    ^ type is RedBlackTree<string, never>
 * ```
 */
export const empty: <K, V = never>(ord: Order<K>) => RedBlackTree<K, V> = RBT.empty

// ✅ behaves as intuitively expected
/**
 * Creates a new `RedBlackTree` from an iterable collection of key/value pairs.
 *
 * @since 2.0.0
 * @category constructors
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const getRBTFromIterableOrderedByNumber =
 *   RedBlackTree.fromIterable(Order.number)
 *
 * const arr = [[6, 1], [9, 2], [6, 3], [7, 4]] as const
 *
 * // data-last call
 * const RBT1 = getRBTFromIterableOrderedByNumber(arr)
 *
 * console.log(RBT1)
 * //          ^ type is RedBlackTree<6 | 9 | 7, 1 | 2 | 3 | 4>
 * // outputs: {
 * //   _id: "RedBlackTree",
 * //   values: [
 * //     [ 6, 3 ], [ 6, 1 ], [ 7, 4 ], [ 9, 2 ]
 * //   ],
 * // }
 *
 * // data-first call
 * const RBT2 = RedBlackTree.fromIterable(arr, Order.number)
 * //    ^ type is RedBlackTree<6 | 9 | 7, 1 | 2 | 3 | 4>
 * ```
 */
export const fromIterable: {
  <B>(ord: Order<B>): <K extends B, V>(entries: Iterable<readonly [K, V]>) => RedBlackTree<K, V>
  <K extends B, V, B>(entries: Iterable<readonly [K, V]>, ord: Order<B>): RedBlackTree<K, V>
} = RBT.fromIterable

// ✅ behaves as intuitively expected
/**
 * Constructs a new `RedBlackTree` from the specified entries.
 *
 * @since 2.0.0
 * @category constructors
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"]
 * )
 *
 * console.log(RBT)
 * //          ^ type is RedBlackTree<number, string>
 * // outputs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 * ```
 */
export const make: <K>(
  ord: Order<K>
) => <Entries extends Array<readonly [K, any]>>(
  ...entries: Entries
) => RedBlackTree<K, Entries[number] extends readonly [any, infer V] ? V : never> = RBT.make

// ⚠️ Didn't understood the motivation behind making it an iterable that starts iterating from that point, instead of just value getter
/**
 * Returns an iterator that points to the element at the specified index of the
 * tree.
 *
 * **Note**: The iterator will run through elements in order.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * // data-first
 * const iterableAtExistingIndex = RedBlackTree.at(RBT, 2)
 * //    ^ type is Iterable<[number, string]>
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 * }
 *
 * log(iterableAtExistingIndex)
 * // Logs:
 * // key: 7, value: 3
 * // key: 9, value: 2
 *
 * // data-last
 * const emptyIterableAtNonexistentIndex = RedBlackTree.at(6)(RBT)
 *
 * log(emptyIterableAtNonexistentIndex)
 * // Logs nothing
 * ```
 */
export const at: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
} = RBT.atForwards

// ⚠️ Doesn't behave as intuitively expected???
/**
 * Returns an iterator that points to the element at the specified index of the
 * tree.
 *
 * **Note**: The iterator will run through elements in reverse order.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * // data-first
 * const iterableAtExistingIndex = RedBlackTree.atReversed(RBT, 2)
 * //    ^ type is Iterable<[number, string]>
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 * }
 *
 * log(iterableAtExistingIndex)
 * // Logs:
 * // Actual
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 * // Expected
 * // key: 9, value: 2
 * // key: 7, value: 3
 *
 * // data-last
 * const emptyIterableAtNonexistentIndex = RedBlackTree.atReversed(6)(RBT)
 *
 * log(emptyIterableAtNonexistentIndex)
 * // Logs
 * // Actual:
 * // nothing
 * // Expected
 * // nothing
 * ```
 */
export const atReversed: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
} = RBT.atBackwards

// ✅ behaves as intuitively expected
/**
 * Finds all values in the tree associated with the specified key.
 *
 * @since 2.0.0
 * @category elements
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 5, "4" ], [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 *
 * // data-first
 * const chunkFound = RedBlackTree.findAll(RBT, 6)
 * //    ^ type is Chunk<string>
 *
 * console.log(chunkFound)
 * // Logs: { _id: "Chunk", values: [ "1", "3" ] }
 *
 * // data-last
 * const chunkNotFound = RedBlackTree.findAll(12)(RBT)
 *
 * console.log(chunkNotFound)
 * // Logs: { _id: "Chunk", values: [] }
 * ```
 */
export const findAll: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Chunk<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Chunk<V>
} = RBT.findAll

// ✅ behaves as intuitively expected
/**
 * Finds the first value in the tree associated with the specified key, if it exists.
 *
 * @category elements
 * @since 2.0.0
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 5, "4" ], [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 *
 * // data-first
 * const optionSomeFound = RedBlackTree.findFirst(RBT, 6)
 * //    ^ type is Option<string>
 *
 * console.log(optionSomeFound)
 * // Logs: { _id: "Option", _tag: "Some", value: "1" }
 *
 * // data-last
 * const optionNoneFound = RedBlackTree.findFirst(12)(RBT)
 *
 * console.log(optionNoneFound)
 * // Logs: { _id: "Option", _tag: "None" }
 * ```
 */
export const findFirst: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Option<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Option<V>
} = RBT.findFirst

// ✅ behaves as intuitively expected
/**
 * Returns the first entry in the tree, if it exists.
 *
 * @since 2.0.0
 * @category getters
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 5, "4" ], [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 *
 * const optionSomeFound = RedBlackTree.first(RBT)
 * //    ^ type is Option<[number, string]>
 *
 * console.log(optionSomeFound)
 * // Logs: { _id: "Option", _tag: "Some", value: [ 5, "4" ] }
 *
 * const optionNoneFound = RedBlackTree.first(
 *   RedBlackTree.empty(Order.number)
 * )
 *
 * console.log(optionNoneFound)
 * // Logs: { _id: "Option", _tag: "None" }
 * ```
 */
export const first: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]> = RBT.first

// ✅ behaves as intuitively expected
/**
 * Returns the element at the specified index within the tree or `None` if the
 * specified index does not exist.
 *
 * @since 2.0.0
 * @category elements
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * // data-first
 * const optionSomeFound = RedBlackTree.getAt(RBT, 2)
 * //    ^ type is Option<[number, string]>
 *
 * console.log(optionSomeFound)
 * // Logs: { _id: "Option", _tag: "Some", value: [ 7, "3" ] }
 *
 * // data-last
 * const optionNoneFound = RedBlackTree.getAt(6)(RBT)
 *
 * console.log(optionNoneFound)
 * // Logs: { _id: "Option", _tag: "None" }
 * ```
 */
export const getAt: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Option<[K, V]>
} = RBT.getAt

// ✅ behaves as intuitively expected
/**
 * Gets the `Order<K>` that the `RedBlackTree<K, V>` is using.
 *
 * @since 2.0.0
 * @category getters
 *
 * @example
 *
 * ```ts
 * import { Order, pipe, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(
 *   pipe(Order.number, Order.reverse)
 * )(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 9, "2" ], [ 7, "3" ], [ 6, "1" ], [ 5, "4" ]],
 * // }
 *
 * const numbersDescendingOrder = RedBlackTree.getOrder(RBT)
 * //    ^ type is Order<number>
 *
 * console.log([6, 9, 7, 5].sort(numbersDescendingOrder))
 * // Logs: [ 9, 7, 6, 5 ]
 * ```
 */
export const getOrder: <K, V>(self: RedBlackTree<K, V>) => Order<K> = RBT.getOrder

// ✅ behaves as intuitively expected
/**
 * Returns an iterator that traverse entries in order with keys greater than the
 * specified key.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, pipe, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(
 *   pipe(Order.number, Order.reverse)
 * )(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 9, "2" ], [ 7, "3" ], [ 6, "1" ], [ 5, "4" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const iterableWithHalfOfRBT = RedBlackTree.greaterThan(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(iterableWithHalfOfRBT)
 * // Logs:
 * // key: 6, value: 1
 * // key: 5, value: 4
 *
 * // data-last
 * const iterableWithFullRBT = RedBlackTree.greaterThan(12)(RBT)
 *
 * log(iterableWithFullRBT)
 * // Logs:
 * // key: 9, value: 2
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 *
 * const emptyIterable = RedBlackTree.greaterThan(5)(RBT)
 *
 * log(emptyIterable)
 * // Logs nothing
 * ```
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
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const iterableWithFullRBT = RedBlackTree.greaterThanReversed(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(iterableWithFullRBT)
 * // Logs:
 * // key: 9, value: 2
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 * // Expected
 * // key: 9, value: 2
 *
 * // data-last
 * const emptyIterable = RedBlackTree.greaterThanReversed(12)(RBT)
 *
 * log(emptyIterable)
 * // Logs
 * // Actual
 * // nothing
 * // Expected
 * // nothing
 *
 * const iterableWithHalfOfRBT = RedBlackTree.greaterThanReversed(5)(RBT)
 *
 * log(iterableWithHalfOfRBT)
 * // Logs:
 * // Actual:
 * // key: 6, value: 1
 * // key: 5, value: 4
 * // Expected:
 * // key: 9, value: 2
 * // key: 7, value: 3
 * // key: 6, value: 1
 * ```
 */
export const greaterThanReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanBackwards

// ✅ behaves as intuitively expected
/**
 * Returns an iterator that traverse entries in order with keys greater than or
 * equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const iterableWithHalfOfRBT = RedBlackTree.greaterThanEqual(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(iterableWithHalfOfRBT)
 * // Logs:
 * // key: 7, value: 3
 * // key: 9, value: 2
 *
 * // data-last
 * const emptyIterable = RedBlackTree.greaterThanEqual(12)(RBT)
 *
 * log(emptyIterable)
 * // Logs nothing
 *
 * const iterableWithFullRBT = RedBlackTree.greaterThanEqual(5)(RBT)
 *
 * log(iterableWithFullRBT)
 * // Logs:
 * // key: 5, value: 4
 * // key: 6, value: 1
 * // key: 7, value: 3
 * // key: 9, value: 2
 * ```
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
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const iterable1 = RedBlackTree.greaterThanEqualReversed(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(iterable1)
 * // Logs:
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 *
 * // data-last
 * const emptyIterable = RedBlackTree.greaterThanEqualReversed(12)(RBT)
 *
 * log(emptyIterable)
 * // Logs nothing
 *
 * const iterable2 = RedBlackTree.greaterThanEqualReversed(5)(RBT)
 *
 * log(iterable2)
 * // Logs:
 * // key: 5, value: 4
 * ```
 */
export const greaterThanEqualReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
} = RBT.greaterThanEqualBackwards

// ✅ behaves as intuitively expected
/**
 * Checks if an item with a certain key exists.
 *
 * @since 2.0.0
 * @category elements
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 5, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * // data-first
 * const wasExistingKeyFound = RedBlackTree.has(RBT, 7)
 * //    ^ type is boolean
 *
 * console.log(wasExistingKeyFound)
 * // Logs: true
 *
 * // data-last
 * const wasNonexistentKeyFound = RedBlackTree.has(12)(RBT)
 *
 * console.log(wasNonexistentKeyFound)
 * // Logs: false
 * ```
 */
export const has: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => boolean
  <K, V>(self: RedBlackTree<K, V>, key: K): boolean
} = RBT.has

// ✅ behaves as intuitively expected
/**
 * Insert a new item into the tree.
 *
 * @since 2.0.0
 *
 * @example
 *
 * ```ts
 * import { flow, Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)([6, "1"])
 * //    ^ RedBlackTree<number, string>
 *
 * // data-first
 * const RBT1 = RedBlackTree.insert(RBT, 7, "3").pipe(
 *   (_RBT) => RedBlackTree.insert(_RBT, 7, "14")
 * )
 *
 * // data-last
 * const RBT2 = flow(
 *   RedBlackTree.insert(5, "4"),
 *   RedBlackTree.insert(5, "12")
 * )(RBT)
 *
 * // Since RBTs are immutable, updates happen indepedently
 *
 * console.log(RBT)
 * // Logs: { _id: "RedBlackTree", values: [[ 6, "1" ]] }
 *
 * console.log(RBT1)
 * // Logs: { _id: "RedBlackTree", values: [[ 6, "1" ], [ 7, "14" ], [ 7, "3" ]] }
 *
 * console.log(RBT2)
 * // Logs: { _id: "RedBlackTree", values: [[ 5, "12" ], [ 5, "4" ], [ 6, "1" ]] }
 * ```
 */
export const insert: {
  <K, V>(key: K, value: V): (self: RedBlackTree<K, V>) => RedBlackTree<K, V>
  <K, V>(self: RedBlackTree<K, V>, key: K, value: V): RedBlackTree<K, V>
} = RBT.insert

// ✅ behaves as intuitively expected
/**
 * Get all the keys present in the tree in order.
 *
 * @since 2.0.0
 * @category getters
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [6, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 6, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * const keysFound = RedBlackTree.keys(RBT)
 * //    ^ type is IterableIterator<number>
 *
 * console.log([...keysFound])
 * // Logs: [ 6, 6, 7, 9 ]
 *
 * console.log([...RedBlackTree.keys(
 *   RedBlackTree.empty(Order.number)
 * )])
 * // Logs: []
 * ```
 */
export const keys: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K> = RBT.keysForward

// ✅ behaves as intuitively expected (after I fixed it)
/**
 * Get all the keys present in the tree in reverse order.
 *
 * @since 2.0.0
 * @category getters
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [6, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 6, "4" ], [ 6, "1" ], [ 7, "3" ], [ 9, "2" ]],
 * // }
 *
 * const keysFound = RedBlackTree.keysReversed(RBT)
 * //    ^ type is IterableIterator<number>
 *
 * console.log([...keysFound])
 * // Logs: [ 9, 7, 6, 6 ]
 *
 * console.log([...RedBlackTree.keysReversed(
 *   RedBlackTree.empty(Order.number)
 * )])
 * // Logs: []
 * ```
 */
export const keysReversed: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K> = RBT.keysBackward

// ✅ behaves as intuitively expected
/**
 * Returns the last entry in the tree, if it exists.
 *
 * @since 2.0.0
 * @category getters
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 5, "4" ], [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 *
 * const optionSomeFound = RedBlackTree.last(RBT)
 * //    ^ type is Option<[number, string]>
 *
 * console.log(optionSomeFound)
 * // Logs: { _id: "Option", _tag: "Some", value: [ 9, "2" ] }
 *
 * const optionNoneFound = RedBlackTree.last(
 *   RedBlackTree.empty(Order.number)
 * )
 *
 * console.log(optionNoneFound)
 * // Logs: { _id: "Option", _tag: "None" }
 * ```
 */
export const last: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]> = RBT.last

// ❌ Doesn't behave as intuitively expected!!!
/**
 * Returns an iterator that traverse entries in order with keys less than the
 * specified key.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, pipe, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(
 *   pipe(Order.number, Order.reverse)
 * )(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 9, "2" ], [ 7, "3" ], [ 6, "1" ], [ 5, "4" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const iterableWithFullRBT = RedBlackTree.lessThan(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(iterableWithFullRBT)
 * // Logs:
 * // key: 9, value: 2
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 *
 * // data-last
 * const emptyIterable = RedBlackTree.lessThan(12)(RBT)
 *
 * log(emptyIterable)
 * // Logs nothing
 *
 * const iterableWithHalfOfRBT = RedBlackTree.lessThan(5)(RBT)
 *
 * log(iterableWithHalfOfRBT)
 * // Logs:
 * // key: 6, value: 1
 * // key: 5, value: 4
 * ```
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

// ❌ Doesn't behave as intuitively expected!!!
/**
 * Returns an iterator that traverse entries in order with keys less than or
 * equal to the specified key.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, pipe, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(
 *   pipe(Order.number, Order.reverse)
 * )(
 *   [6, "1"],
 *   [9, "2"],
 *   [7, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [[ 9, "2" ], [ 7, "3" ], [ 6, "1" ], [ 5, "4" ]],
 * // }
 *
 * const log = (iter: Iterable<[any, any]>) => {
 *   for (const [key, value] of iter) {
 *     console.log(`key: ${key}, value: ${value}`)
 *   }
 *   console.log("-")
 * }
 *
 * // data-first
 * const RBT1 = RedBlackTree.lessThanEqual(RBT, 7)
 * //    ^ type is Iterable<[number, string]>
 *
 * log(RBT1)
 * // Logs:
 * // key: 7, value: 3
 * // key: 6, value: 1
 * // key: 5, value: 4
 *
 * // data-last
 * const emptyIterable = RedBlackTree.lessThanEqual(12)(RBT)
 *
 * log(emptyIterable)
 * // Logs nothing
 *
 * const RBT2 = RedBlackTree.lessThanEqual(5)(RBT)
 *
 * log(RBT2)
 * // Logs:
 * // key: 5, value: 4
 * ```
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

// ✅ behaves as intuitively expected
/**
 * Execute the specified function for each node of the tree, in order.
 *
 * @since 2.0.0
 * @category traversing
 *
 * @example
 *
 * ```ts
 * import { Order, RedBlackTree } from "effect"
 *
 * const RBT = RedBlackTree.make(Order.number)(
 *   [6, "1"],
 *   [9, "2"],
 *   [6, "3"],
 *   [5, "4"]
 * )
 *
 * console.log(RBT)
 * //          ^ RedBlackTree<number, string>
 * // Logs: {
 * //   _id: "RedBlackTree",
 * //   values: [ [ 5, "4" ], [ 6, "3" ], [ 6, "1" ], [ 9, "2" ] ],
 * // }
 *
 * // data-first
 * RedBlackTree.forEach(RBT, console.log)
 * // Logs:
 * // 5 4
 * // 6 3
 * // 6 1
 * // 9 2
 *
 * // data-last
 * RedBlackTree.forEach(console.log)(RedBlackTree.empty(Order.number))
 * // Logs nothing
 * ```
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
