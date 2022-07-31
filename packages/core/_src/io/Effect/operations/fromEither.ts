/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEither
 */
export function fromEither<E, A>(either: LazyArg<Either<E, A>>): Effect<never, E, A> {
  return Effect.sync(either).flatMap((either) => either.fold(Effect.fail, Effect.succeed))
}
