// ets_tracing: off

import * as I from "../../../Iterable/index.js"
import * as O from "../../../Option/index.js"
import * as St from "../../../Structural/index.js"
import { AtomicNumber } from "../../../Support/AtomicNumber/index.js"

export const HashMapTypeId = Symbol()
export type HashMapTypeId = typeof HashMapTypeId

class Node<K, V> implements Iterable<readonly [K, V]> {
  constructor(readonly k: K, public v: V, public next?: Node<K, V>) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Node<K, V> | undefined = this
    let n = 0
    return {
      next: () => {
        if (c) {
          const kv = [c.k, c.v] as const
          c = c.next
          n++
          return {
            value: kv,
            done: false
          }
        } else {
          return {
            value: n,
            done: true
          }
        }
      }
    }
  }
}

/**
 * A Mutable HashMap
 */
export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _typeId: HashMapTypeId = HashMapTypeId
  readonly backingMap = new Map<number, Node<K, V>>()
  readonly length = new AtomicNumber(0)

  get(k: K): O.Option<V> {
    const hash = St.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      return O.none
    }

    let c: Node<K, V> | undefined = arr

    while (c) {
      if (St.equals(k, c.k)) {
        return O.some(c.v)
      }
      c = c.next
    }

    return O.none
  }

  remove(k: K): HashMap<K, V> {
    const hash = St.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      return this
    }

    if (St.equals(k, arr.k)) {
      if (typeof arr.next !== "undefined") {
        this.backingMap.set(hash, arr.next)
      } else {
        this.backingMap.delete(hash)
      }
      this.length.decrementAndGet()
      return this
    }

    let next: Node<K, V> | undefined = arr.next
    let curr = arr

    while (next) {
      if (St.equals(k, next.k)) {
        curr.next = next.next
        this.length.decrementAndGet()
        return this
      }
      curr = next
      next = next.next
    }

    return this
  }

  set(k: K, v: V): HashMap<K, V> {
    const hash = St.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      this.backingMap.set(hash, new Node(k, v))
      this.length.incrementAndGet()
      return this
    }

    let c: Node<K, V> | undefined = arr
    let l = arr

    while (c) {
      if (St.equals(k, c.k)) {
        c.v = v
        return this
      }
      l = c
      c = c.next
    }

    this.length.incrementAndGet()
    l.next = new Node(k, v)
    return this
  }

  update(k: K, f: (v: V) => V): HashMap<K, V> {
    const hash = St.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      return this
    }

    let c: Node<K, V> | undefined = arr

    while (c) {
      if (St.equals(k, c.k)) {
        c.v = f(c.v)
        return this
      }
      c = c.next
    }

    return this
  }

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return I.chain_(this.backingMap, ([, _]) => _)[Symbol.iterator]()
  }
}

/**
 * Creates a new map
 */
export function make<K, V>() {
  return new HashMap<K, V>()
}

/**
 * Creates a new map from an Iterable
 */
export function from<K, V>(xs: Iterable<readonly [K, V]>): HashMap<K, V> {
  const res = make<K, V>()
  for (const p of xs) {
    res.set(...p)
  }
  return res
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): O.Option<V> {
  return map.get(key)
}

/**
 * Lookup the value for `key` in `map` using internal hash function.
 *
 * @ets_data_first get_
 */
export function get<K>(key: K) {
  return <V>(map: HashMap<K, V>) => get_(map, key)
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V) {
  return map.set(key, value)
}

/**
 * Store `value` for `key` in `map` using internal hash function.
 *
 * @ets_data_first set_
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}

/**
 * Remove the entry for `key` in `map` using internal hash.
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K): HashMap<K, V> {
  return map.remove(key)
}

/**
 * Remove the entry for `key` in `map` using internal hash.
 *
 * @ets_data_first remove_
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, V>(map: HashMap<K, V>) {
  return map.length.get
}

/**
 * Update a value if exists
 */
export function update_<K, V>(map: HashMap<K, V>, key: K, f: (v: V) => V) {
  return map.update(key, f)
}

/**
 * Update a value if exists
 *
 * @ets_data_first update_
 */
export function update<K, V>(key: K, f: (v: V) => V) {
  return (map: HashMap<K, V>) => update_(map, key, f)
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 */
export function modify_<K, V>(
  map: HashMap<K, V>,
  key: K,
  f: (v: O.Option<V>) => O.Option<V>
) {
  const v = f(map.get(key))
  if (O.isSome(v)) {
    map.set(key, v.value)
  } else {
    map.remove(key)
  }
  return map
}

/**
 * Alter the value stored for `key` in `map` using function `f` using internal hash function.
 *
 *  `f` is invoked with the current value for `k` if it exists,
 * or no arguments if no such value exists.
 *
 * `modify` will always either update or insert a value into the map.
 * Returns a map with the modified value. Does not alter `map`.
 *
 * @ets_data_first modify_
 */
export function modify<K, V>(key: K, f: (v: O.Option<V>) => O.Option<V>) {
  return (map: HashMap<K, V>) => modify_(map, key, f)
}
