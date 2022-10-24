/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapErrorCause
 * @tsplus pipeable effect/core/io/Effect tapErrorCause
 * @category sequencing
 * @since 1.0.0
 */
export function tapErrorCause<E, R2, E2, X>(
  f: (cause: Cause<E>) => Effect<R2, E2, X>
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) => f(cause).zipRight(Effect.failCause(cause)),
      Effect.succeed
    )
}
