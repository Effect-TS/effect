import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus fluent ets/Effect reject
 */
export function reject_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => Option<E1>,
  __etsTrace?: string
) {
  return self.rejectEffect((a) => pf(a).map(Effect.failNow))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => Option<E1>, __etsTrace?: string) {
  return <R, E>(self: Effect<R, E, A>) => self.reject(pf)
}
