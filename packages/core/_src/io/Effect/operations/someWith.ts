/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Maybe`.
 *
 * @tsplus fluent ets/Effect someWith
 */
export function someWith_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, Maybe<A>>,
  f: (effect: Effect<R, Maybe<E>, A>) => Effect<R1, Maybe<E1>, A1>,
  __tsplusTrace?: string
): Effect<R | R1, E | E1, Maybe<A1>> {
  return Effect.suspendSucceed(f(self.some).unsome())
}

/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Maybe`.
 *
 * @tsplus static ets/Effect/Aspects someWith
 */
export const someWith = Pipeable(someWith_)
