import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

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
 * @ets_data_first continueOrFailSTM_
 */
export function continueOrFailSTM<E1, A, R2, E2, A2>(
  e: LazyArg<E1>,
  pf: (a: A) => Option<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>) => self.continueOrFailSTM(e, pf)
}
