import type { _K, _V } from "./symbols"

export const HashMapSym = Symbol.for("@effect-ts/core/collection/immutable/HashMap")
export type HashMapSym = typeof HashMapSym

/**
 * @tsplus type ets/HashMap
 */
export interface HashMap<K, V> extends Iterable<readonly [K, V]> {
  readonly [HashMapSym]: HashMapSym
  readonly [_K]: () => K
  readonly [_V]: () => V

  [Symbol.iterator](): Iterator<readonly [K, V]>
}

/**
 * @tsplus type ets/HashMapOps
 */
export interface HashMapOps {}
export const HashMap: HashMapOps = {}

/**
 * @tsplus unify ets/HashMap
 */
export function unifyHashMap<X extends HashMap<any, any>>(
  self: X
): HashMap<
  [X] extends [HashMap<infer K, any>] ? K : never,
  [X] extends [HashMap<any, infer V>] ? V : never
> {
  return self
}

/**
 * @tsplus static ets/HashMapOps isHashMap
 */
export function isHashMap<K, V>(u: Iterable<readonly [K, V]>): u is HashMap<K, V>
export function isHashMap(u: unknown): u is HashMap<unknown, unknown>
export function isHashMap(u: unknown): u is HashMap<unknown, unknown> {
  return typeof u === "object" && u != null && HashMapSym in u
}
