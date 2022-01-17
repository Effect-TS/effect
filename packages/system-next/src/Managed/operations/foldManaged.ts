import { failureOrCause } from "../../Cause"
import { fold_ } from "../../Either"
import type { Managed } from "../definition"
import { failCause } from "./failCause"
import { foldCauseManaged_ } from "./foldCauseManaged"

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 */
export function foldManaged_<R, E, A, R1, E1, A1, R2, E2, A2>(
  self: Managed<R, E, A>,
  failure: (e: E) => Managed<R1, E1, A1>,
  success: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return foldCauseManaged_(
    self,
    (cause) => fold_(failureOrCause(cause), failure, failCause),
    success,
    __trace
  )
}

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 *
 * @ets_data_first foldManaged_
 */
export function foldManaged<E, A, R1, E1, A1, R2, E2, A2>(
  failure: (e: E) => Managed<R1, E1, A1>,
  success: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1 & R2, E1 | E2, A1 | A2> =>
    foldManaged_(self, failure, success, __trace)
}
