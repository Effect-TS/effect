import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

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
  return self.continueOrFailSTM(e, (x) => pf(x).map(STM.succeedNow))
}

/**
 * Fail with `e` if the supplied partial function does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(e: LazyArg<E1>, pf: (a: A) => Option<A2>) {
  return <R, E>(self: STM<R, E, A>) => self.continueOrFail(e, pf)
}
