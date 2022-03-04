import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus fluent ets/STM reject
 */
export function reject_<R, E, A, E1>(
  self: STM<R, E, A>,
  pf: (a: A) => Option<E1>
): STM<R, E | E1, A> {
  return self.rejectSTM((a) => pf(a).map(STM.failNow))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> => self.reject(pf)
}
