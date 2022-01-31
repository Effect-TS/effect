import type { Cause } from "../../Cause"
import type { Effect } from "../definition"
import { IFold } from "../definition"

/**
 * A more powerful version of `foldEffect` that allows recovering from any kind
 * of failure except interruptions.
 *
 * @tsplus fluent ets/Effect foldCauseEffect
 */
export function foldCauseEffect_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __etsTrace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(self, failure, success, __etsTrace)
}

/**
 * A more powerful version of `foldEffect` that allows recovering from any kind
 * of failure except interruptions.
 *
 * @ets_data_first foldCauseEffect_
 */
export function foldCauseEffect<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldCauseEffect_(self, failure, success)
}
