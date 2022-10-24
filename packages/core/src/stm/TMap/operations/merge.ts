/**
 * If the key `k` is not already associated with a value, stores the provided
 * value, otherwise merge the existing value with the new one using function
 * `f` and store the result
 *
 * @tsplus static effect/core/stm/TMap.Aspects merge
 * @tsplus pipeable effect/core/stm/TMap merge
 * @category mutations
 * @since 1.0.0
 */
export function merge_<K, V>(k: K, v: V, f: (values: readonly [V, V]) => V) {
  return (self: TMap<K, V>): STM<never, never, V> =>
    self.get(k).flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return self.put(k, v).as(v)
        }
        case "Some": {
          const v1 = f([option.value, v])
          return self.put(k, v1).as(v1)
        }
      }
    })
}
