/**
 * A version of `catchSome` that gives you the trace of the error.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSomeTrace
 * @tsplus pipeable effect/core/io/Effect catchSomeTrace
 */
export function catchSomeTrace<E, R2, E2, A2>(
  f: (tuple: Tuple<[E, Trace]>) => Maybe<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldCauseEffect(
      (cause): Effect<R2, E | E2, A2> =>
        cause
          .failureTraceOrCause
          .fold(
            (tuple) => f(tuple).getOrElse(Effect.failCause(cause)),
            Effect.failCause
          ),
      Effect.succeed
    )
}
