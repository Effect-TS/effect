import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Trace } from "../../../io/Trace"
import { Effect } from "../definition"

/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @tsplus fluent ets/Effect catchAllTrace
 */
export function catchAllTrace_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R2, E2, A | A2> {
  return self.foldTraceEffect(h, Effect.succeedNow)
}

/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @ets_data_first catchAllTrace_
 */
export function catchAllTrace<E, R2, E2, A2>(
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E2, A | A2> =>
    self.catchAllTrace(h)
}
