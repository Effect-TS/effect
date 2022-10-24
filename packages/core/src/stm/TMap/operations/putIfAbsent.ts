/**
 * Stores new binding in the map if it does not already exist.
 *
 * @tsplus static effect/core/stm/TMap.Aspects putIfAbsent
 * @tsplus pipeable effect/core/stm/TMap putIfAbsent
 * @category mutations
 * @since 1.0.0
 */
export function putIfAbsent<K, V>(k: K, v: V) {
  return (self: TMap<K, V>): STM<never, never, void> =>
    self.get(k).flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return self.put(k, v)
        }
        case "Some": {
          return STM.unit
        }
      }
    })
}
