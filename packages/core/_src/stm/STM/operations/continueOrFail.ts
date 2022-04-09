/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus fluent ets/STM continueOrFail
 */
export function continueOrFail_<R, E, E1, A, A2>(
  self: STM<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Option<A2>
) {
  return self.continueOrFailSTM(e, (x) => pf(x).map(STM.succeedNow));
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus static ets/STM/Aspects continueOrFail
 */
export const continueOrFail = Pipeable(continueOrFail_);
