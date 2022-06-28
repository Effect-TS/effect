/**
 * A version of `tapError` that gives you the trace of the error.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapErrorTrace
 * @tsplus pipeable effect/core/io/Effect tapErrorTrace
 */
export function tapErrorTrace<R2, E2, X>(
  f: (trace: Trace) => Effect<R2, E2, X>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) =>
        cause.failureTraceOrCause.fold(
          ({ tuple: [_, trace] }) => f(trace).zipRight(Effect.failCauseNow(cause)),
          () => Effect.failCauseNow(cause)
        ),
      Effect.succeedNow
    )
}
