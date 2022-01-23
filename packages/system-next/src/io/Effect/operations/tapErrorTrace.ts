import * as E from "../../../data/Either"
import type { Trace } from "../../../io/Trace"
import { failureTraceOrCause } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"
import { zipRight_ } from "./zipRight"

/**
 * A version of `tapError` that gives you the trace of the error.
 *
 * @ets fluent ets/Effect tapErrorTrace
 */
export function tapErrorTrace_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (trace: Trace) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return foldCauseEffect_(
    self,
    (cause) =>
      E.fold_(
        failureTraceOrCause(cause),
        ({ tuple: [_, trace] }) => zipRight_(f(trace), failCause(cause)),
        () => failCause(cause)
      ),
    succeedNow,
    __trace
  )
}

/**
 * A version of `tapError` that gives you the trace of the error.
 *
 * @ets_data_first tapErrorTrace_
 */
export function tapErrorTrace<E, R2, E2, X>(
  f: (cause: Trace) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapErrorTrace_(self, f, __trace)
}
