/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @tsplus fluent ets/Effect absolve
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
 * @tsplus static ets/Effect/Ops absolve
 */
export function absolve<R, E, A>(
  self: LazyArg<Effect<R, E, Either<E, A>>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(self).flatMap((either) => Effect.fromEither(either))
}
