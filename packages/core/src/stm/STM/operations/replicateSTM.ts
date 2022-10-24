import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Performs this transaction the specified number of times and collects the
 * results.
 *
 * @tsplus static effect/core/stm/STM.Aspects replicateSTM
 * @tsplus pipeable effect/core/stm/STM replicateSTM
 * @category mutations
 * @since 1.0.0
 */
export function replicateSTM(n: number) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, Chunk<A>> =>
    STM.suspend(STM.collectAll(self.replicate(n)))
}
