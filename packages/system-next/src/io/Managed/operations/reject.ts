import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets fluent ets/Managed reject
 */
export function reject_<R, E, A, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => Option<E1>,
  __etsTrace?: string
) {
  return self.rejectManaged((a) => pf(a).map(Managed.failNow))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>, __etsTrace?: string) {
  return <R, E>(self: Managed<R, E, A>) => reject_(self, pf)
}
