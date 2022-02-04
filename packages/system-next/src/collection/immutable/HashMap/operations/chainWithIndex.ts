import { HashMap } from "../definition"

/**
 * Chains over the entries of the `HashMap` using the specified function.
 *
 * **NOTE**: the hash and equal of both maps have to be the same.
 *
 * @tsplus fluent ets/HashMap flatMapWithIndex
 */
export function chainWithIndex_<K, V, A>(
  self: HashMap<K, V>,
  f: (k: K, v: V) => HashMap<K, A>
): HashMap<K, A> {
  return self.reduceWithIndex(HashMap.empty<K, A>(), (z, k, v) =>
    z.mutate((m) => {
      f(k, v).forEachWithIndex((_k, _a) => {
        m.set(_k, _a)
      })
    })
  )
}

/**
 * Chains over the entries of the `HashMap` using the specified function.
 *
 * **NOTE**: the hash and equal of both maps have to be the same.
 *
 * @ets_data_first chainWithIndex_
 */
export function chainWithIndex<K, V, A>(f: (k: K, v: V) => HashMap<K, A>) {
  return (self: HashMap<K, V>): HashMap<K, A> => self.flatMapWithIndex(f)
}
