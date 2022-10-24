import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from the specified partial function.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrRetrySTM
 * @tsplus pipeable effect/core/stm/STM continueOrRetrySTM
 * @category mutations
 * @since 1.0.0
 */
export function continueOrRetrySTM<A, R2, E2, A2>(
  pf: (a: A) => Option.Option<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>): STM<R2 | R, E | E2, A2> =>
    self.flatMap((a): STM<R2, E2, A2> => pipe(pf(a), Option.getOrElse(STM.retry)))
}
