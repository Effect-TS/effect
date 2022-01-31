// ets_tracing: off

/* adapted from https://github.com/gcanti/fp-ts */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Op from "../../../Option/index.js"
import { fromNullable } from "../../../Option/index.js"
import type { MutableMap } from "../../../Support/Mutable/index.js"
import * as Tp from "../Tuple/index.js"

/**
 * Map type
 */
export type Map<K, T> = ReadonlyMap<K, T>

/**
 * Create from a key-value array
 */
export function make<K, V>(
  values: Iterable<readonly [K, V] | Tp.Tuple<[K, V]>>
): Map<K, V> {
  const map = new Map()
  for (const _ of values) {
    if (Tp.isTuple(_)) {
      map.set(_.get(0), _.get(1))
    } else {
      map.set(_[0], _[1])
    }
  }
  return map
}

/**
 * Removes None values
 */
export function compact<K, A>(fa: Map<K, Op.Option<A>>): Map<K, A> {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, Op.Option<A>]>

  while (!(e = entries.next()).done) {
    const [k, oa] = e.value

    if (Op.isSome(oa)) {
      m.set(k, oa.value)
    }
  }

  return m
}

/**
 * Empty Map
 */
export const empty: Map<never, never> = new Map<never, never>()

/**
 * Filter out None and map
 */
export function filterMap_<E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Op.Option<B>
): Map<E, B> {
  return filterMapWithIndex_(fa, (_, a) => f(a))
}

/**
 * Filter out None and map
 */
export function filterMap<A, B>(f: (a: A) => Op.Option<B>) {
  return <E>(fa: Map<E, A>) => filterMap_(fa, f)
}

/**
 * Filter out None and map
 */
export function filterMapWithIndex_<K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Op.Option<B>
): Map<K, B> {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>

  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const o = f(k, a)

    if (Op.isSome(o)) {
      m.set(k, o.value)
    }
  }

  return m
}

/**
 * Filter out None and map
 */
export function filterMapWithIndex<K, A, B>(f: (k: K, a: A) => Op.Option<B>) {
  return (fa: Map<K, A>) => filterMapWithIndex_(fa, f)
}

/**
 * Filter out None and map
 */
export function filterWithIndex_<K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
): Map<K, A> {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>

  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value

    if (p(k, a)) {
      m.set(k, a)
    }
  }

  return m
}

/**
 * Filter out None and map
 */
export function filterWithIndex<K, A>(p: (k: K, a: A) => boolean) {
  return (fa: Map<K, A>) => filterWithIndex_(fa, p)
}

/**
 * Construct a new Readonly Map
 */
export function fromMutable<K, A>(m: MutableMap<K, A>): Map<K, A> {
  return new Map(m)
}

/**
 * Test whether or not a map is empty
 */
export function isEmpty<K, A>(d: Map<K, A>): boolean {
  return d.size === 0
}

/**
 * Maps values using f
 */
export function map_<E, A, B>(fa: Map<E, A>, f: (a: A) => B): Map<E, B> {
  return mapWithIndex_(fa, (_, a) => f(a))
}

/**
 * Maps values using f
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(fa: Map<E, A>) => map_(fa, f)
}

/**
 * Maps values using f
 */
export function mapWithIndex_<K, A, B>(fa: Map<K, A>, f: (k: K, a: A) => B): Map<K, B> {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>

  while (!(e = entries.next()).done) {
    const [key, a] = e.value

    m.set(key, f(key, a))
  }

  return m
}

/**
 * Maps values using f
 */
export function mapWithIndex<K, A, B>(f: (k: K, a: A) => B) {
  return (fa: Map<K, A>) => mapWithIndex_(fa, f)
}

export interface Next<A> {
  readonly done?: boolean
  readonly value: A
}

/**
 * Create a map with one key/value pair
 */
export function singleton<K, A>(k: K, a: A): Map<K, A> {
  return new Map([[k, a]])
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, A>(d: Map<K, A>): number {
  return d.size
}

/**
 * Construct a new mutable map by copying this one
 */
export function toMutable<K, A>(m: Map<K, A>): MutableMap<K, A> {
  return new Map(m)
}

export function insert_<K, V>(self: ReadonlyMap<K, V>, k: K, v: V): ReadonlyMap<K, V> {
  const m = copy<K, V>(self)

  m.set(k, v)

  return m
}

export function insert<K, V>(k: K, v: V) {
  return (self: ReadonlyMap<K, V>) => insert_(self, k, v)
}

export function remove_<K, V>(self: ReadonlyMap<K, V>, k: K): ReadonlyMap<K, V> {
  const m = copy(self)

  m.delete(k)

  return m
}

export function remove<K>(k: K) {
  return <V>(self: ReadonlyMap<K, V>) => remove_(self, k)
}

export function removeMany_<K, V>(
  self: ReadonlyMap<K, V>,
  ks: Iterable<K>
): ReadonlyMap<K, V> {
  const m = copy(self)

  for (const k of ks) {
    m.delete(k)
  }

  return m
}

export function removeMany<K>(ks: Iterable<K>) {
  return <V>(self: ReadonlyMap<K, V>) => removeMany_(self, ks)
}

export function lookup_<K, V>(m: ReadonlyMap<K, V>, k: K): Op.Option<NonNullable<V>> {
  return fromNullable(m.get(k))
}

export function lookup<K>(k: K) {
  return <V>(m: ReadonlyMap<K, V>) => lookup_(m, k)
}

export function copy<K, V>(self: ReadonlyMap<K, V>) {
  const m = new Map<K, V>()

  self.forEach((v, k) => {
    m.set(k, v)
  })

  return m
}
