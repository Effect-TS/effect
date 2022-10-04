/**
 * Retains bindings matching predicate.
 *
 * @tsplus static effect/core/stm/TMap.Aspects retainIfDiscard
 * @tsplus pipeable effect/core/stm/TMap retainIfDiscard
 */
export function retainIfDiscard<K, V>(f: (kv: readonly [K, V]) => boolean) {
  return (self: TMap<K, V>): STM<never, never, void> => self.removeIfDiscard((_) => !f(_))
}
