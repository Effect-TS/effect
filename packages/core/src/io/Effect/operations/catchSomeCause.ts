/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSomeCause
 * @tsplus pipeable effect/core/io/Effect catchSomeCause
 */
export function catchSomeCause<E, R2, E2, A2>(f: (_: Cause<E>) => Maybe<Effect<R2, E2, A2>>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldCauseEffect(
      (c): Effect<R2, E | E2, A2> =>
        f(c).fold(
          () => Effect.failCause(c),
          (a) => a
        ),
      Effect.succeed
    )
}
