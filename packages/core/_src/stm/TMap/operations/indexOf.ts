function hash<K>(k: K): number {
  const h = Hash.unknown(k)
  return h ^ (h >>> 16)
}

/**
 * @internal
 * @tsplus static ets/TMap/Ops indexOf
 */
export function indexOf<K>(k: K, capacity: number): number {
  return hash(k) & (capacity - 1)
}
