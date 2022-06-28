/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEither
 */
export function fromEither<E, A>(
  either: LazyArg<Either<E, A>>,
  __tsplusTrace?: string
): Effect<never, E, A> {
  return Effect.succeed(either).flatMap((either) => either.fold(Effect.failNow, Effect.succeedNow))
}
