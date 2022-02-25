import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Trace } from "../../../io/Trace"
import { Effect } from "../definition"

/**
 * A version of `foldEffect` that gives you the trace of the error.
 *
 * @tsplus fluent ets/Effect foldTraceEffect
 */
export function foldTraceEffect_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  failure: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return self.foldCauseEffect(
    (cause) => cause.failureTraceOrCause().fold(failure, Effect.failCauseNow),
    success
  )
}

/**
 * A version of `foldEffect` that gives you the trace of the error.
 *
 * @ets_data_first foldTraceEffect_
 */
export function foldTraceEffect<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    self.foldTraceEffect(failure, success)
}
