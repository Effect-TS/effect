/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapError
 * @tsplus pipeable effect/core/io/Effect tapError
 * @category sequencing
 * @since 1.0.0
 */
export function tapError<E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return f(either.left).zipRight(Effect.failCause(cause))
          }
          case "Right": {
            return Effect.failCause(cause)
          }
        }
      },
      Effect.succeed
    )
}
