import { HashMap } from "../definition"

/**
 * Maps over the values of the `HashMap` using the specified function.
 *
 * @tsplus fluent ets/HashMap map
 */
export function map_<K, V, A>(self: HashMap<K, V>, f: (v: V) => A): HashMap<K, A> {
  return self.reduceWithIndex(HashMap.empty<K, A>(), (z, k, v) => z.set(k, f(v)))
}

/**
 * Maps over the values of the `HashMap` using the specified function.
 *
 * @ets_data_first map_
 */
export function map<V, A>(f: (v: V) => A) {
  return <K>(self: HashMap<K, V>): HashMap<K, A> => self.map(f)
}
