import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @tsplus fluent ets/STM continueOrRetry
 */
export function continueOrRetry_<R, E, A, A2>(
  self: STM<R, E, A>,
  pf: (a: A) => Option<A2>
): STM<R, E, A2> {
  return self.continueOrRetrySTM((x) => pf(x).map(STM.succeedNow))
}

/**
 * Retry the transaction if the supplied partial function does not match,
 * otherwise succeed with the returned value.
 *
 * @ets_data_first continueOrRetry_
 */
export function continueOrRetry<A, A2>(pf: (a: A) => Option<A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A2> => self.continueOrRetry(pf)
}
