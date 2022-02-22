import type { HashMap } from "../definition"

/**
 * Updates the value of the specified key within the `HashMap` if it exists.
 *
 * @tsplus fluent ets/HashMap update
 */
export function update_<K, V>(
  self: HashMap<K, V>,
  key: K,
  f: (v: V) => V
): HashMap<K, V> {
  return self.modify(key, (option) => option.map(f))
}

/**
 * Updates the value of the specified key within the `HashMap` if it exists.
 *
 * @ets_data_first update_
 */
export function update<K, V>(key: K, f: (v: V) => V) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.update(key, f)
}
