/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus fluent ets/STM continueOrFailSTM
 */
export function continueOrFailSTM_<R, E, E1, A, R2, E2, A2>(
  self: STM<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Option<STM<R2, E2, A2>>
) {
  return self.flatMap((a): STM<R2, E1 | E2, A2> => pf(a).getOrElse(STM.fail(e)))
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus static ets/STM/Aspects continueOrFailSTM
 */
export const continueOrFailSTM = Pipeable(continueOrFailSTM_)
