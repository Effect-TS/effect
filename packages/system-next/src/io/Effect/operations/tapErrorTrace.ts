import * as E from "../../../data/Either"
import type { Trace } from "../../../io/Trace"
import { failureTraceOrCause } from "../../Cause"
import { Effect } from "../definition"

/**
 * A version of `tapError` that gives you the trace of the error.
 *
 * @tsplus fluent ets/Effect tapErrorTrace
 */
export function tapErrorTrace_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (trace: Trace) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) =>
      E.fold_(
        failureTraceOrCause(cause),
        ({ tuple: [_, trace] }) => f(trace).zipRight(Effect.failCauseNow(cause)),
        () => Effect.failCauseNow(cause)
      ),
    Effect.succeedNow
  )
}

/**
 * A version of `tapError` that gives you the trace of the error.
 *
 * @ets_data_first tapErrorTrace_
 */
export function tapErrorTrace<E, R2, E2, X>(
  f: (cause: Trace) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapErrorTrace_(self, f)
}
