/**
 * Retains bindings matching predicate and returns removed bindings.
 *
 * @tsplus static effect/core/stm/TMap.Aspects retainIf
 * @tsplus pipeable effect/core/stm/TMap retainIf
 */
export function retainIf<K, V>(f: (kv: readonly [K, V]) => boolean) {
  return (self: TMap<K, V>): STM<never, never, Chunk<readonly [K, V]>> =>
    self.removeIf((_) => !f(_))
}
