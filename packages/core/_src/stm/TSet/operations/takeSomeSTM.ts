import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Transactionally takes all matching values, or retries until there is at least one.
 *
 * @tsplus fluent ets/TSet takeSomeSTM
 */
export function takeSomeSTM_<A, B, R, E>(self: TSet<A>, pf: (a: A) => STM<R, Maybe<E>, B>): STM<R, E, Chunk<B>> {
  concreteTSet(self)
  return self.tmap.takeSomeSTM((kv) => pf(kv.get(0)))
}

/**
 * Transactionally takes all matching values, or retries until there is at least one.
 *
 * @tsplus static ets/TSet/Aspects takeSomeSTM
 */
export const takeSomeSTM = Pipeable(takeSomeSTM_)
