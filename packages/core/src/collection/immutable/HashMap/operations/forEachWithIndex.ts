import type { HashMap } from "../definition"

/**
 * Applies the specified function to the entries of the `HashMap`.a
 *
 * @tsplus fluent ets/HashMap forEachWithIndex
 */
export function forEachWithIndex_<K, V>(
  self: HashMap<K, V>,
  f: (k: K, v: V) => void
): void {
  self.reduceWithIndex(undefined as void, (_, key, value) => f(key, value))
}

/**
 * Applies the specified function to the entries of the `HashMap`.
 *
 * @ets_data_first forEachWithIndex_
 */
export function forEachWithIndex<K, V>(f: (k: K, v: V) => void) {
  return (self: HashMap<K, V>): void => self.forEachWithIndex(f)
}
