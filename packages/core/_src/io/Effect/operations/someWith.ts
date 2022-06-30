/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Maybe`.
 *
 * @tsplus static effect/core/io/Effect.Aspects someWith
 * @tsplus pipeable effect/core/io/Effect someWith
 */
export function someWith<R, E, A, R1, E1, A1>(
  f: (effect: Effect<R, Maybe<E>, A>) => Effect<R1, Maybe<E1>, A1>,
  __tsplusTrace?: string
) {
  return (self: Effect<R, E, Maybe<A>>): Effect<R | R1, E | E1, Maybe<A1>> => Effect.suspendSucceed(f(self.some).unsome)
}
