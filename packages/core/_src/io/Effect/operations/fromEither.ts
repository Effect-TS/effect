/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEither
 */
export function fromEither<E, A>(either: Either<E, A>): Effect<never, E, A> {
  return either.fold(Effect.fail, Effect.succeed)
}
