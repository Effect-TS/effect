/**
 * Atomically performs transactional-effect for each binding present in map.
 *
 * @tsplus static effect/core/stm/TMap.Aspects forEach
 * @tsplus pipeable effect/core/stm/TMap forEach
 */
export function forEach<K, V, R, E>(f: (kv: readonly [K, V]) => STM<R, E, void>) {
  return (self: TMap<K, V>): STM<R, E, void> => self.foldSTM(undefined as void, (_, kv) => f(kv))
}
