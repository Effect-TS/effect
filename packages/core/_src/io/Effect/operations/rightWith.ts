/**
 * Performs the specified operation while "zoomed in" on the `Right` case of an
 * `Either`.
 *
 * @tsplus static effect/core/io/Effect.Aspects rightWith
 */
export function rightWith<R, E, A, A1, B, B1, R1, E1>(
  f: (effect: Effect<R, Either<A, E>, B>) => Effect<R1, Either<A1, E1>, B1>,
  __tsplusTrace?: string
) {
  return (self: Effect<R, E, Either<A, B>>): Effect<R | R1, E | E1, Either<A1, B1>> =>
    Effect.suspendSucceed(f(self.right).unright)
}
