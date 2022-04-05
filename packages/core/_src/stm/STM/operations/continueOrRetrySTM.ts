/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from the specified partial function.
 *
 * @tsplus fluent ets/STM continueOrRetrySTM
 */
export function continueOrRetrySTM_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  pf: (a: A) => Option<STM<R2, E2, A2>>
): STM<R2 & R, E | E2, A2> {
  return self.flatMap((a): STM<R2, E2, A2> => pf(a).getOrElse(STM.retry));
}

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from the specified partial function.
 *
 * @tsplus static ets/STM/Aspects continueOrRetrySTM
 */
export const continueOrRetrySTM = Pipeable(continueOrRetrySTM_);
