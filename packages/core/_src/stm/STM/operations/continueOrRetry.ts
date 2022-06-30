/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrRetry
 * @tsplus pipeable effect/core/stm/STM continueOrRetry
 */
export function continueOrRetry<R, E, A, A2>(pf: (a: A) => Maybe<A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A2> =>
    self.continueOrRetrySTM(
      (x) => pf(x).map(STM.succeedNow)
    )
}
