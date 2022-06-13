import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Transactionally takes the first matching value, or retries until there is one.
 *
 * @tsplus fluent ets/TSet takeFirstSTM
 */
export function takeFirstSTM_<A, B, R, E>(self: TSet<A>, pf: (a: A) => STM<R, Option<E>, B>): STM<R, E, B> {
  concreteTSet(self)
  return self.tmap.takeFirstSTM((kv) => pf(kv.get(0)))
}

/**
 * Transactionally takes the first matching value, or retries until there is one.
 *
 * @tsplus static ets/TSet/Aspects takeFirstSTM
 */
export const takeFirstSTM = Pipeable(takeFirstSTM_)
