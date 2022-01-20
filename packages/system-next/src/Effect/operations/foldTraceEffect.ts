import { failureTraceOrCause } from "../../Cause"
import type * as Tp from "../../Collections/Immutable/Tuple"
import { fold_ } from "../../Either"
import type { Trace } from "../../Trace"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"

/**
 * A version of `foldEffect` that gives you the trace of the error.
 */
export function foldTraceEffect_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  failure: (tuple: Tp.Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return foldCauseEffect_(
    self,
    (c) => fold_(failureTraceOrCause(c), failure, failCause),
    success,
    __trace
  )
}

/**
 * A version of `foldEffect` that gives you the trace of the error.
 *
 * @ets_data_first foldTraceEffect_
 */
export function foldTraceEffect<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (tuple: Tp.Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldTraceEffect_(self, failure, success, __trace)
}
