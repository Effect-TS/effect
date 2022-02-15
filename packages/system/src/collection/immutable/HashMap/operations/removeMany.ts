import type { HashMap } from "../definition"

/**
 * Removes all entries in the `HashMap` which have the specified keys.
 *
 * @tsplus fluent ets/HashMap removeMany
 */
export function removeMany_<K, V>(self: HashMap<K, V>, ks: Iterable<K>): HashMap<K, V> {
  return self.mutate((m) => {
    for (const k of ks) {
      m.remove(k)
    }
  })
}

/**
 * Removes all entries in the `HashMap` which have the specified keys.
 *
 * @ets_data_first removeMany_
 */
export function removeMany<K>(ks: Iterable<K>) {
  return <V>(self: HashMap<K, V>): HashMap<K, V> => self.removeMany(ks)
}
