import { HashMap } from "../definition"

/**
 * Chains over the values of the `HashMap` using the specified function.
 *
 * **NOTE**: the hash and equal of both maps have to be the same.
 *
 * @tsplus fluent ets/HashMap flatMap
 */
export function chain_<K, V, A>(
  self: HashMap<K, V>,
  f: (v: V) => HashMap<K, A>
): HashMap<K, A> {
  return self.reduceWithIndex(HashMap.empty<K, A>(), (z, _, v) =>
    z.mutate((m) => {
      f(v).forEachWithIndex((_k, _a) => {
        m.set(_k, _a)
      })
    })
  )
}

/**
 * Chains over the values of the `HashMap` using the specified function.
 *
 * **NOTE**: the hash and equal of both maps have to be the same.
 *
 * @ets_data_first chain_
 */
export function chain<K, V, A>(f: (v: V) => HashMap<K, A>) {
  return (self: HashMap<K, V>): HashMap<K, A> => self.flatMap(f)
}
