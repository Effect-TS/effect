/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapEither
 * @tsplus pipeable effect/core/io/Effect tapEither
 */
export function tapEither<E, A, R2, E2, X>(
  f: (either: Either<E, A>) => Effect<R2, E2, X>,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) =>
        cause.failureOrCause.fold(
          (e) => f(Either.left(e)).zipRight(Effect.failCauseNow(cause)),
          () => Effect.failCauseNow(cause)
        ),
      (a) => f(Either.right(a)).as(a)
    )
}
