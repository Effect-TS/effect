/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @tsplus fluent ets/Effect tapEither
 */
export function tapEither_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (either: Either<E, A>) => Effect<R2, E2, X>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) =>
      cause.failureOrCause().fold(
        (e) => f(Either.left(e)).zipRight(Effect.failCauseNow(cause)),
        () => Effect.failCauseNow(cause)
      ),
    (a) => f(Either.right(a)).as(a)
  )
}

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @tsplus static ets/Effect/Aspects tapEither
 */
export const tapEither = Pipeable(tapEither_)
