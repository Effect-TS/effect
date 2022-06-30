/**
 * Stores new binding in the map if it does not already exist.
 *
 * @tsplus static effect/core/stm/TMap.Aspects putIfAbsent
 * @tsplus pipeable effect/core/stm/TMap putIfAbsent
 */
export function putIfAbsent<K, V>(k: K, v: V) {
  return (self: TMap<K, V>): STM<never, never, void> =>
    self.get(k).flatMap((_) => _.fold(self.put(k, v), (_) => STM.unit))
}
