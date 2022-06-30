/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapError
 * @tsplus pipeable effect/core/io/Effect tapError
 */
export function tapError<E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) =>
        cause.failureOrCause.fold(
          (e) => f(e).zipRight(Effect.failCauseNow(cause)),
          () => Effect.failCauseNow(cause)
        ),
      Effect.succeedNow
    )
}
