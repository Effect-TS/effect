/**
 * @since 2.0.0
 */
import { dual } from "./exports/Function.js"
import { HashMap } from "./exports/HashMap.js"
import { NodeInspectSymbol, toJSON, toString } from "./exports/Inspectable.js"
import { MutableRef } from "./exports/MutableRef.js"
import { Option } from "./exports/Option.js"
import { pipeArguments } from "./exports/Pipeable.js"

import type { MutableHashMap } from "./exports/MutableHashMap.js"

export const TypeId: unique symbol = Symbol.for("effect/MutableHashMap") as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

const MutableHashMapProto: Omit<MutableHashMap<unknown, unknown>, "backingMap"> = {
  [TypeId]: TypeId,
  [Symbol.iterator](this: MutableHashMap<unknown, unknown>): Iterator<[unknown, unknown]> {
    return this.backingMap.current[Symbol.iterator]()
  },
  toString() {
    return toString(this.toJSON())
  },
  toJSON() {
    return {
      _id: "MutableHashMap",
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

const fromHashMap = <K, V>(backingMap: HashMap<K, V>): MutableHashMap<K, V> => {
  const map = Object.create(MutableHashMapProto)
  map.backingMap = MutableRef.make(backingMap)
  return map
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty = <K = never, V = never>(): MutableHashMap<K, V> => fromHashMap<K, V>(HashMap.empty())

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <Entries extends Array<readonly [any, any]>>(
  ...entries: Entries
) => MutableHashMap<
  Entries[number] extends readonly [infer K, any] ? K : never,
  Entries[number] extends readonly [any, infer V] ? V : never
> = (...entries) => fromIterable(entries)

/**
 * @since 2.0.0
 * @category conversions
 */
export const fromIterable = <K, V>(entries: Iterable<readonly [K, V]>): MutableHashMap<K, V> =>
  fromHashMap(HashMap.fromIterable(entries))

/**
 * @since 2.0.0
 * @category elements
 */
export const get: {
  <K>(key: K): <V>(self: MutableHashMap<K, V>) => Option<V>
  <K, V>(self: MutableHashMap<K, V>, key: K): Option<V>
} = dual<
  <K>(key: K) => <V>(self: MutableHashMap<K, V>) => Option<V>,
  <K, V>(self: MutableHashMap<K, V>, key: K) => Option<V>
>(2, <K, V>(self: MutableHashMap<K, V>, key: K) => HashMap.get(self.backingMap.current, key))

/**
 * @since 2.0.0
 * @category elements
 */
export const has: {
  <K>(key: K): <V>(self: MutableHashMap<K, V>) => boolean
  <K, V>(self: MutableHashMap<K, V>, key: K): boolean
} = dual<
  <K>(key: K) => <V>(self: MutableHashMap<K, V>) => boolean,
  <K, V>(self: MutableHashMap<K, V>, key: K) => boolean
>(2, (self, key) => Option.isSome(get(self, key)))

/**
 * Updates the value of the specified key within the `MutableHashMap` if it exists.
 *
 * @since 2.0.0
 */
export const modify: {
  <K, V>(key: K, f: (v: V) => V): (self: MutableHashMap<K, V>) => MutableHashMap<K, V>
  <K, V>(self: MutableHashMap<K, V>, key: K, f: (v: V) => V): MutableHashMap<K, V>
} = dual<
  <K, V>(key: K, f: (v: V) => V) => (self: MutableHashMap<K, V>) => MutableHashMap<K, V>,
  <K, V>(self: MutableHashMap<K, V>, key: K, f: (v: V) => V) => MutableHashMap<K, V>
>(
  3,
  <K, V>(self: MutableHashMap<K, V>, key: K, f: (v: V) => V) => {
    MutableRef.update(self.backingMap, HashMap.modify(key, f))
    return self
  }
)

/**
 * Set or remove the specified key in the `MutableHashMap` using the specified
 * update function.
 *
 * @since 2.0.0
 */
export const modifyAt: {
  <K, V>(key: K, f: (value: Option<V>) => Option<V>): (self: MutableHashMap<K, V>) => MutableHashMap<K, V>
  <K, V>(self: MutableHashMap<K, V>, key: K, f: (value: Option<V>) => Option<V>): MutableHashMap<K, V>
} = dual<
  <K, V>(
    key: K,
    f: (value: Option<V>) => Option<V>
  ) => (self: MutableHashMap<K, V>) => MutableHashMap<K, V>,
  <K, V>(
    self: MutableHashMap<K, V>,
    key: K,
    f: (value: Option<V>) => Option<V>
  ) => MutableHashMap<K, V>
>(3, (self, key, f) => {
  const result = f(get(self, key))
  if (Option.isSome(result)) {
    set(self, key, result.value)
  } else {
    remove(self, key)
  }
  return self
})

/**
 * @since 2.0.0
 */
export const remove: {
  <K>(key: K): <V>(self: MutableHashMap<K, V>) => MutableHashMap<K, V>
  <K, V>(self: MutableHashMap<K, V>, key: K): MutableHashMap<K, V>
} = dual<
  <K>(key: K) => <V>(self: MutableHashMap<K, V>) => MutableHashMap<K, V>,
  <K, V>(self: MutableHashMap<K, V>, key: K) => MutableHashMap<K, V>
>(2, <K, V>(self: MutableHashMap<K, V>, key: K) => {
  MutableRef.update(self.backingMap, HashMap.remove(key))
  return self
})

/**
 * @since 2.0.0
 */
export const set: {
  <K, V>(key: K, value: V): (self: MutableHashMap<K, V>) => MutableHashMap<K, V>
  <K, V>(self: MutableHashMap<K, V>, key: K, value: V): MutableHashMap<K, V>
} = dual<
  <K, V>(key: K, value: V) => (self: MutableHashMap<K, V>) => MutableHashMap<K, V>,
  <K, V>(self: MutableHashMap<K, V>, key: K, value: V) => MutableHashMap<K, V>
>(3, <K, V>(self: MutableHashMap<K, V>, key: K, value: V) => {
  MutableRef.update(self.backingMap, HashMap.set(key, value))
  return self
})

/**
 * @since 2.0.0
 * @category elements
 */
export const size = <K, V>(self: MutableHashMap<K, V>): number => HashMap.size(MutableRef.get(self.backingMap))
