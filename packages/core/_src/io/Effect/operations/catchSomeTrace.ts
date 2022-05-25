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
 *
 * @tsplus static ets/Effect/Aspects catchSomeTrace
 */
export const catchSomeTrace = Pipeable(catchSomeTrace_)
