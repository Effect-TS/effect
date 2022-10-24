import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrFail
 * @tsplus pipeable effect/core/stm/STM continueOrFail
 * @category mutations
 * @since 1.0.0
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => Option.Option<A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E1 | E, A2> =>
    self.continueOrFailSTM(
      e,
      (x) => pipe(pf(x), Option.map(STM.succeed))
    )
}
