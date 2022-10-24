import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import type { Option } from "@fp-ts/data/Option"

/**
 * Transactionally takes the first matching value, or retries until there is one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeFirstSTM
 * @tsplus pipeable effect/core/stm/TSet takeFirstSTM
 * @category mutations
 * @since 1.0.0
 */
export function takeFirstSTM<A, R, E, B>(pf: (a: A) => STM<R, Option<E>, B>) {
  return (self: TSet<A>): STM<R, E, B> => {
    concreteTSet(self)
    return self.tmap.takeFirstSTM((kv) => pf(kv[0]))
  }
}
