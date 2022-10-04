import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Transactionally takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeSomeSTM
 * @tsplus pipeable effect/core/stm/TSet takeSomeSTM
 */
export function takeSomeSTM<A, R, E, B>(pf: (a: A) => STM<R, Maybe<E>, B>) {
  return (self: TSet<A>): STM<R, E, Chunk<B>> => {
    concreteTSet(self)
    return self.tmap.takeSomeSTM((kv) => pf(kv[0]))
  }
}
