import type { HashMap } from "../definition"

/**
 * Mutates the `HashMap` within the context of the provided function.
 *
 * @tsplus fluent ets/HashMap mutate
 */
export function mutate_<K, V>(
  self: HashMap<K, V>,
  f: (self: HashMap<K, V>) => void
): HashMap<K, V> {
  const transient = self.beginMutation()
  f(transient)
  return transient.endMutation()
}

/**
 * Mutates the `HashMap` within the context of the provided function.
 *
 * @ets_data_first mutate_
 */
export function mutate<K, V>(f: (self: HashMap<K, V>) => void) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.mutate(f)
}
