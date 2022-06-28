/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEitherCause
 */
export function fromEitherCause<E, A>(
  either: LazyArg<Either<Cause<E>, A>>,
  __tsplusTrace?: string
): Effect<never, E, A> {
  return Effect.succeed(either).flatMap((either) => either.fold(Effect.failCauseNow, Effect.succeedNow))
}
