/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @tsplus fluent ets/Effect orElseEither
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E2, Either<A, A2>> {
  return self.tryOrElse(
    () => that().map(Either.right),
    (a) => Effect.succeedNow(Either.left(a))
  );
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @tsplus static ets/Effect/Aspects orElseEither
 */
export const orElseEither = Pipeable(orElseEither_);
