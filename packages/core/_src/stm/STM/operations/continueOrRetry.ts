/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @tsplus fluent ets/STM continueOrRetry
 */
export function continueOrRetry_<R, E, A, A2>(
  self: STM<R, E, A>,
  pf: (a: A) => Maybe<A2>
): STM<R, E, A2> {
  return self.continueOrRetrySTM((x) => pf(x).map(STM.succeedNow))
}

/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @tsplus static ets/STM/Aspects continueOrRetry
 */
export const continueOrRetry = Pipeable(continueOrRetry_)
