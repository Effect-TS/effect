/**
 * Performs the specified operation while "zoomed in" on the `Right` case of an
 * `Either`.
 *
 * @tsplus fluent ets/Effect rightWith
 */
export function rightWith_<R, E, A, A1, B, B1, R1, E1>(
  self: Effect<R, E, Either<A, B>>,
  f: (effect: Effect<R, Either<A, E>, B>) => Effect<R1, Either<A1, E1>, B1>,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, Either<A1, B1>> {
  return Effect.suspendSucceed(f(self.right).unright())
}

/**
 * Performs the specified operation while "zoomed in" on the `Right` case of an
 * `Either`.
 *
 * @tsplus static ets/Effect/Aspects rightWith
 */
export const rightWith = Pipeable(rightWith_)
