import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stm/TRandom.Ops shuffle
 * @category getters
 * @since 1.0.0
 */
export function shuffle<A>(collection: Iterable<A>): STM<TRandom, never, Chunk<A>> {
  return STM.serviceWithSTM(TRandom.Tag)((_) => _.shuffle(collection))
}
