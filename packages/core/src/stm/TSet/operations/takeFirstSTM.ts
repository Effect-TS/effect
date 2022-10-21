import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Transactionally takes the first matching value, or retries until there is one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeFirstSTM
 * @tsplus pipeable effect/core/stm/TSet takeFirstSTM
 */
export function takeFirstSTM<A, R, E, B>(pf: (a: A) => STM<R, Maybe<E>, B>) {
  return (self: TSet<A>): STM<R, E, B> => {
    concreteTSet(self)
    return self.tmap.takeFirstSTM((kv) => pf(kv[0]))
  }
}
