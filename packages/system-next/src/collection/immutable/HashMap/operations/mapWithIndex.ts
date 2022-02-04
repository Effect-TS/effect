import { HashMap } from "../definition"

/**
 * Maps over the entries of the `HashMap` using the specified function.
 *
 * @tsplus fluent ets/HashMap mapWithIndex
 */
export function mapWithIndex_<K, V, A>(
  self: HashMap<K, V>,
  f: (k: K, v: V) => A
): HashMap<K, A> {
  return self.reduceWithIndex(HashMap.empty<K, A>(), (z, k, v) => z.set(k, f(k, v)))
}

/**
 * Maps over the entries of the `HashMap` using the specified function.
 *
 * @ets_data_first mapWithIndex_
 */
export function mapWithIndex<K, V, A>(f: (k: K, v: V) => A) {
  return (self: HashMap<K, V>): HashMap<K, A> => self.mapWithIndex(f)
}
