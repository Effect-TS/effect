import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { rejectEffect_ } from "./rejectEffect"

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets fluent ets/Effect reject
 */
export function reject_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<E1>,
  __etsTrace?: string
) {
  return rejectEffect_(self, (a) => O.map_(pf(a), failNow), __etsTrace)
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>, __etsTrace?: string) {
  return <R, E>(self: Effect<R, E, A>) => reject_(self, pf)
}
