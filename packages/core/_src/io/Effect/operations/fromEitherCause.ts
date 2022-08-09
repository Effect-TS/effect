/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEitherCause
 */
export function fromEitherCause<E, A>(either: Either<Cause<E>, A>): Effect<never, E, A> {
  return either.fold(Effect.failCause, Effect.succeed)
}
