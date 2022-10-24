import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Retains bindings matching predicate and returns removed bindings.
 *
 * @tsplus static effect/core/stm/TMap.Aspects retainIf
 * @tsplus pipeable effect/core/stm/TMap retainIf
 * @category mutations
 * @since 1.0.0
 */
export function retainIf<K, V>(f: (kv: readonly [K, V]) => boolean) {
  return (self: TMap<K, V>): STM<never, never, Chunk<readonly [K, V]>> =>
    self.removeIf((entry) => !f(entry))
}
