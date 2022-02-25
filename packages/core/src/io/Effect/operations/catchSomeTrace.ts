import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { Trace } from "../../../io/Trace"
import { Effect } from "../definition"

/**
 * A version of `catchSome` that gives you the trace of the error.
 *
 * @tsplus fluent ets/Effect catchSomeTrace
 */
export function catchSomeTrace_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (tuple: Tuple<[E, Trace]>) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldCauseEffect(
    (cause): Effect<R2, E | E2, A2> =>
      cause
        .failureTraceOrCause()
        .fold(
          (tuple) => f(tuple).getOrElse(Effect.failCauseNow(cause)),
          Effect.failCauseNow
        ),
    Effect.succeedNow
  )
}

/**
 * A version of `catchSome` that gives you the trace of the error.
 */
export function catchSomeTrace<E, R2, E2, A2>(
  f: (tuple: Tuple<[E, Trace]>) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    self.catchSomeTrace(f)
}
