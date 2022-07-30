/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapDefect
 * @tsplus pipeable effect/core/io/Effect tapDefect
 */
export function tapDefect<R2, E2, X>(
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) => f(cause.stripFailures).zipRight(Effect.failCause(cause)),
      Effect.succeed
    )
}
