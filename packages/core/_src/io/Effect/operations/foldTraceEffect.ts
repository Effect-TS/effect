/**
 * A version of `foldEffect` that gives you the trace of the error.
 *
 * @tsplus static effect/core/io/Effect.Aspects foldTraceEffect
 * @tsplus pipeable effect/core/io/Effect foldTraceEffect
 */
export function foldTraceEffect<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2 | R3, E2 | E3, A2 | A3> =>
    self.foldCauseEffect(
      (cause) => cause.failureTraceOrCause.fold(failure, Effect.failCause),
      success
    )
}
