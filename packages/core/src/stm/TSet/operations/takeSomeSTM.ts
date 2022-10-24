import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Transactionally takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeSomeSTM
 * @tsplus pipeable effect/core/stm/TSet takeSomeSTM
 * @category mutations
 * @since 1.0.0
 */
export function takeSomeSTM<A, R, E, B>(pf: (a: A) => STM<R, Option<E>, B>) {
  return (self: TSet<A>): STM<R, E, Chunk<B>> => {
    concreteTSet(self)
    return self.tmap.takeSomeSTM((kv) => pf(kv[0]))
  }
}
