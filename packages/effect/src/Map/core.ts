/* adapted from https://github.com/gcanti/fp-ts */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { MutableMap } from "../Mutable"
import * as Op from "../Option"

/**
 * Map type
 */
export type Map<K, T> = ReadonlyMap<K, T>

/**
 * Create from a key-value array
 */
export function make<K, V>(values: readonly (readonly [K, V])[]): Map<K, V> {
  return new Map(values)
}

/**
 * Removes None values
 */
export const compact = <K, A>(fa: Map<K, Op.Option<A>>): Map<K, A> => {
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
export const filterMap: <A, B>(
  f: (a: A) => Op.Option<B>
) => <E>(fa: Map<E, A>) => Map<E, B> = (f) => filterMapWithIndex((_, a) => f(a))

/**
 * Filter out None and map
 */
export const filterMap_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Op.Option<B>
) => Map<E, B> = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))

/**
 * Filter out None and map
 */
export const filterMapWithIndex = <K, A, B>(
  f: (k: K, a: A) => Op.Option<B>
): ((fa: Map<K, A>) => Map<K, B>) => {
  return (fa) => filterMapWithIndex_(fa, f)
}

/**
 * Filter out None and map
 */
export const filterMapWithIndex_ = <K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Op.Option<B>
): Map<K, B> => {
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
export const filterWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: Map<K, A>) => Map<K, A>) => {
  return (fa) => filterWithIndex_(fa, p)
}

/**
 * Filter out None and map
 */
export const filterWithIndex_ = <K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
): Map<K, A> => {
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
export const map_: <E, A, B>(fa: Map<E, A>, f: (a: A) => B) => Map<E, B> = (fa, f) =>
  map(f)(fa)

/**
 * Maps values using f
 */
export const map: <A, B>(f: (a: A) => B) => <E>(fa: Map<E, A>) => Map<E, B> = (f) =>
  mapWithIndex((_, a) => f(a))

/**
 * Maps values using f
 */
export const mapWithIndex = <K, A, B>(
  f: (k: K, a: A) => B
): ((fa: Map<K, A>) => Map<K, B>) => {
  return (fa) => mapWithIndex_(fa, f)
}

/**
 * Maps values using f
 */
export const mapWithIndex_ = <K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => B
): Map<K, B> => {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    m.set(key, f(key, a))
  }
  return m
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
