import type { Option } from "../../../data/Option"
import { map_ } from "../../../data/Option"
import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { rejectManaged_ } from "./rejectManaged"

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => Option<E1>,
  __trace?: string
) {
  return rejectManaged_(self, (x) => map_(pf(x), failNow), __trace)
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => reject_(self, pf, __trace)
}
