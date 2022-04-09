/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static ets/Effect/Ops fromEitherCause
 */
export function fromEitherCause<E, A>(
  either: LazyArg<Either<Cause<E>, A>>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.succeed(either).flatMap((either) => either.fold(Effect.failCauseNow, Effect.succeedNow));
}
