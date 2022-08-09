/**
 * If the key `k` is not already associated with a value, stores the provided
 * value, otherwise merge the existing value with the new one using function
 * `f` and store the result
 *
 * @tsplus static effect/core/stm/TMap.Aspects merge
 * @tsplus pipeable effect/core/stm/TMap merge
 */
export function merge_<K, V>(k: K, v: V, f: (values: Tuple<[V, V]>) => V) {
  return (self: TMap<K, V>): STM<never, never, V> =>
    self.get(k).flatMap((_) =>
      _.fold(self.put(k, v).as(v), (v0) => {
        const v1 = f(Tuple(v0, v))

        return self.put(k, v1).as(v1)
      })
    )
}
