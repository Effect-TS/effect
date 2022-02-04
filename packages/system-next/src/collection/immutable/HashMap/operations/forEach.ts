import type { HashMap } from "../definition"

/**
 * Applies the specified function to the values of the `HashMap`.
 *
 * @tsplus fluent ets/HashMap forEach
 */
export function forEach_<K, V>(self: HashMap<K, V>, f: (v: V) => void): void {
  self.forEachWithIndex((_, value) => f(value))
}

/**
 * Applies the specified function to the values of the `HashMap`.
 *
 * @ets_data_first forEach_
 */
export function forEach<V>(f: (v: V) => void) {
  return <K>(self: HashMap<K, V>): void => self.forEach(f)
}
