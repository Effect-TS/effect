/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEitherCause
 */
export function fromEitherCause<E, A>(either: LazyArg<Either<Cause<E>, A>>): Effect<never, E, A> {
  return Effect.sync(either).flatMap((either) => either.fold(Effect.failCause, Effect.succeed))
}
