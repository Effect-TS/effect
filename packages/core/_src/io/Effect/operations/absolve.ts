/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @tsplus getter effect/core/io/Effect absolve
 */
export function absolveNow<R, E, A>(
  self: Effect<R, E, Either<E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.absolve(self)
}

/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @tsplus static effect/core/io/Effect.Ops absolve
 */
export function absolve<R, E, A>(
  self: LazyArg<Effect<R, E, Either<E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(self).flatMap((either) => Effect.fromEither(either))
}
