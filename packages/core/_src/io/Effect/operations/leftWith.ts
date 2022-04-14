/**
 * Performs the specified operation while "zoomed in" on the `Left` case of an
 * `Either`.
 *
 * @tsplus fluent ets/Effect leftWith
 */
export function leftWith_<R, E, A, A1, B, B1, R1, E1>(
  self: Effect<R, E, Either<A, B>>,
  f: (effect: Effect<R, Either<E, B>, A>) => Effect<R1, Either<E1, B1>, A1>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Either<A1, B1>> {
  return Effect.suspendSucceed(f(self.left).unleft());
}

/**
 * Performs the specified operation while "zoomed in" on the `Left` case of an
 * `Either`.
 *
 * @tsplus static ets/Effect/Aspects leftWith
 */
export const leftWith = Pipeable(leftWith_);
