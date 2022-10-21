/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from the specified partial function.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrRetrySTM
 * @tsplus pipeable effect/core/stm/STM continueOrRetrySTM
 */
export function continueOrRetrySTM<A, R2, E2, A2>(
  pf: (a: A) => Maybe<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>): STM<R2 | R, E | E2, A2> =>
    self.flatMap((a): STM<R2, E2, A2> => pf(a).getOrElse(STM.retry))
}
