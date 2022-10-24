import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrRetry
 * @tsplus pipeable effect/core/stm/STM continueOrRetry
 * @category mutations
 * @since 1.0.0
 */
export function continueOrRetry<R, E, A, A2>(pf: (a: A) => Option.Option<A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A2> =>
    self.continueOrRetrySTM(
      (x) => pipe(pf(x), Option.map(STM.succeed))
    )
}
