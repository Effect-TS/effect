/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSome
 * @tsplus pipeable effect/core/io/Effect catchSome
 */
export function catchSome<E, R2, E2, A2>(f: (e: E) => Maybe<Effect<R2, E2, A2>>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldCauseEffect(
      (cause): Effect<R2, E | E2, A2> =>
        cause
          .failureOrCause
          .fold((x) => f(x).getOrElse(Effect.failCause(cause)), Effect.failCause),
      Effect.succeed
    )
}
