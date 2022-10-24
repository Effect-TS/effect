import * as Equal from "@fp-ts/data/Equal"

function hash<K>(k: K): number {
  const h = Equal.hash(k)
  return h ^ (h >>> 16)
}

/**
 * @tsplus static effect/core/stm/TMap.Ops indexOf
 * @internal
 */
export function indexOf<K>(k: K, capacity: number): number {
  return hash(k) & (capacity - 1)
}
