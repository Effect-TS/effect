import type { Equal } from "../../../Equal"
import type { Hash } from "../../../Hash"
import * as I from "../../../Iterable"
import * as O from "../../../Option"
import { AtomicNumber } from "../../../Support/AtomicNumber"

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

export class HashMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _typeId: HashMapTypeId = HashMapTypeId
  readonly backingMap = new Map<number, Node<K, V>>()
  readonly length = new AtomicNumber(0)

  constructor(readonly eqKey: Equal<K>, readonly hashKey: Hash<K>) {}

  get(k: K): O.Option<V> {
    const hash = this.hashKey.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      return O.none
    }

    let c: Node<K, V> | undefined = arr

    while (c) {
      if (this.eqKey.equals(k, c.k)) {
        return O.fromNullable(c.v)
      }
      c = c.next
    }

    return O.none
  }

  set(k: K, v: V): HashMap<K, V> {
    const hash = this.hashKey.hash(k)
    const arr = this.backingMap.get(hash)

    if (typeof arr === "undefined") {
      this.backingMap.set(hash, new Node(k, v))
      this.length.incrementAndGet()
      return this
    }

    let c: Node<K, V> | undefined = arr
    let l = arr

    while (c) {
      if (this.eqKey.equals(k, c.k)) {
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

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return I.chain_(this.backingMap, ([, _]) => _)[Symbol.iterator]()
  }
}

/**
 * Creates a new map
 */
export function make<K, V>(E: Equal<K>, H: Hash<K>) {
  return new HashMap<K, V>(E, H)
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
 * @dataFirst get_
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
 * @dataFirst set_
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, V>(map: HashMap<K, V>) {
  return map.length.get
}
