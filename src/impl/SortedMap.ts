/**
 * @since 2.0.0
 */
import { Equal } from "../Equal.js"
import { dual, pipe } from "../Function.js"
import { Hash } from "../Hash.js"
import { NodeInspectSymbol, toJSON, toString } from "../Inspectable.js"
import { Option } from "../Option.js"
import type { Order } from "../Order.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import { RedBlackTree as RBT } from "../RedBlackTree.js"

import type { SortedMap } from "../SortedMap.js"

export const TypeId: unique symbol = Symbol.for("effect/SortedMap")

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

const SortedMapProto: Omit<SortedMap<unknown, unknown>, "tree"> = {
  [TypeId]: TypeId,
  [Hash.symbol]<K, V>(this: SortedMap<K, V>): number {
    return pipe(Hash.hash(this.tree), Hash.combine(Hash.hash("effect/SortedMap")))
  },
  [Equal.symbol]<K, V>(this: SortedMap<K, V>, that: unknown): boolean {
    return isSortedMap(that) && Equal.equals(this.tree, that.tree)
  },
  [Symbol.iterator]<K, V>(this: SortedMap<K, V>): Iterator<readonly [K, V]> {
    return this.tree[Symbol.iterator]()
  },
  toString() {
    return toString(this.toJSON())
  },
  toJSON() {
    return {
      _id: "SortedMap",
      values: Array.from(this).map(toJSON)
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeImpl = <K, V>(tree: RBT<K, V>): SortedMap<K, V> => {
  const self = Object.create(SortedMapProto)
  self.tree = tree
  return self
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSortedMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is SortedMap<K, V>
  (u: unknown): u is SortedMap<unknown, unknown>
} = (u: unknown): u is SortedMap<unknown, unknown> => hasProperty(u, TypeId)

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty = <K, V = never>(ord: Order<K>): SortedMap<K, V> => makeImpl<K, V>(RBT.empty<K, V>(ord))

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable = <K>(ord: Order<K>) => <V>(iterable: Iterable<readonly [K, V]>): SortedMap<K, V> =>
  makeImpl(RBT.fromIterable<K, V>(ord)(iterable))

/**
 * @since 2.0.0
 * @category constructors
 */
export const make =
  <K>(ord: Order<K>) =>
  <Entries extends ReadonlyArray<readonly [K, any]>>(...entries: Entries): SortedMap<
    K,
    Entries[number] extends (readonly [any, infer V]) ? V : never
  > => fromIterable(ord)(entries)

/**
 * @since 2.0.0
 * @category predicates
 */
export const isEmpty = <K, V>(self: SortedMap<K, V>): boolean => size(self) === 0

/**
 * @since 2.0.0
 * @category predicates
 */
export const isNonEmpty = <K, V>(self: SortedMap<K, V>): boolean => size(self) > 0

/**
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => Option<V>
  <K, V>(self: SortedMap<K, V>, key: K): Option<V>
} = dual<
  <K>(key: K) => <V>(self: SortedMap<K, V>) => Option<V>,
  <K, V>(self: SortedMap<K, V>, key: K) => Option<V>
>(2, (self, key) => RBT.findFirst(self.tree, key))

/**
 * Gets the `Order<K>` that the `SortedMap<K, V>` is using.
 *
 * @since 2.0.0
 * @category getters
 */
export const getOrder = <K, V>(self: SortedMap<K, V>): Order<K> => RBT.getOrder(self.tree)

/**
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => boolean
  <K, V>(self: SortedMap<K, V>, key: K): boolean
} = dual<
  <K>(key: K) => <V>(self: SortedMap<K, V>) => boolean,
  <K, V>(self: SortedMap<K, V>, key: K) => boolean
>(2, (self, key) => Option.isSome(get(self, key)))

/**
 * @since 2.0.0
 * @category elements
 */
export const headOption = <K, V>(self: SortedMap<K, V>): Option<readonly [K, V]> => RBT.first(self.tree)

/**
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <A, K, B>(f: (a: A, k: K) => B): (self: SortedMap<K, A>) => SortedMap<K, B>
  <K, A, B>(self: SortedMap<K, A>, f: (a: A, k: K) => B): SortedMap<K, B>
} = dual<
  <A, K, B>(f: (a: A, k: K) => B) => (self: SortedMap<K, A>) => SortedMap<K, B>,
  <K, A, B>(self: SortedMap<K, A>, f: (a: A, k: K) => B) => SortedMap<K, B>
>(2, <K, A, B>(self: SortedMap<K, A>, f: (a: A, k: K) => B) =>
  reduce(
    self,
    empty<K, B>(RBT.getOrder(self.tree)),
    (acc, v, k) => set(acc, k, f(v, k))
  ))

/**
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <B, A, K>(zero: B, f: (acc: B, value: A, key: K) => B): (self: SortedMap<K, A>) => B
  <K, A, B>(self: SortedMap<K, A>, zero: B, f: (acc: B, value: A, key: K) => B): B
} = dual<
  <B, A, K>(zero: B, f: (acc: B, value: A, key: K) => B) => (self: SortedMap<K, A>) => B,
  <K, A, B>(self: SortedMap<K, A>, zero: B, f: (acc: B, value: A, key: K) => B) => B
>(3, (self, zero, f) => RBT.reduce(self.tree, zero, f))

/**
 * @since 2.0.0
 * @category elements
 */
export const remove: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => SortedMap<K, V>
  <K, V>(self: SortedMap<K, V>, key: K): SortedMap<K, V>
} = dual<
  <K>(key: K) => <V>(self: SortedMap<K, V>) => SortedMap<K, V>,
  <K, V>(self: SortedMap<K, V>, key: K) => SortedMap<K, V>
>(2, (self, key) => makeImpl(RBT.removeFirst(self.tree, key)))

/**
 * @since 2.0.0
 * @category elements
 */
export const set: {
  <K, V>(key: K, value: V): (self: SortedMap<K, V>) => SortedMap<K, V>
  <K, V>(self: SortedMap<K, V>, key: K, value: V): SortedMap<K, V>
} = dual<
  <K, V>(key: K, value: V) => (self: SortedMap<K, V>) => SortedMap<K, V>,
  <K, V>(self: SortedMap<K, V>, key: K, value: V) => SortedMap<K, V>
>(3, (self, key, value) =>
  RBT.has(self.tree, key)
    ? makeImpl(RBT.insert(RBT.removeFirst(self.tree, key), key, value))
    : makeImpl(RBT.insert(self.tree, key, value)))

/**
 * @since 2.0.0
 * @category getters
 */
export const size = <K, V>(self: SortedMap<K, V>): number => RBT.size(self.tree)

/**
 * @since 2.0.0
 * @category getters
 */
export const keys = <K, V>(self: SortedMap<K, V>): IterableIterator<K> => RBT.keys(self.tree)

/**
 * @since 2.0.0
 * @category getters
 */
export const values = <K, V>(self: SortedMap<K, V>): IterableIterator<V> => RBT.values(self.tree)

/**
 * @since 2.0.0
 * @category getters
 */
export const entries = <K, V>(self: SortedMap<K, V>): IterableIterator<readonly [K, V]> => {
  const iterator: any = self.tree[Symbol.iterator]()
  iterator[Symbol.iterator] = () => entries(self)
  return iterator
}
