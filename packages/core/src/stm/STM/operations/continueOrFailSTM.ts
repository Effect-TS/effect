/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus static effect/core/stm/STM.Aspects continueOrFailSTM
 * @tsplus pipeable effect/core/stm/STM continueOrFailSTM
 */
export function continueOrFailSTM<E1, A, R2, E2, A2>(e: E1, pf: (a: A) => Maybe<STM<R2, E2, A2>>) {
  return <R, E>(self: STM<R, E, A>): STM<R | R2, E | E1 | E2, A2> =>
    self.flatMap((a): STM<R2, E1 | E2, A2> => pf(a).getOrElse(STM.fail(e)))
}
