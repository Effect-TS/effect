import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapEither
 * @tsplus pipeable effect/core/io/Effect tapEither
 * @category sequencing
 * @since 1.0.0
 */
export function tapEither<E, A, R2, E2, X>(
  f: (either: Either.Either<E, A>) => Effect<R2, E2, X>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.foldCauseEffect(
      (cause) => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return f(either).zipRight(Effect.failCause(cause))
          }
          case "Right": {
            return Effect.failCause(cause)
          }
        }
      },
      (a) => f(Either.right(a)).as(a)
    )
}
