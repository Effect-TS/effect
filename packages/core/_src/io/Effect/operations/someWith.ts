/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Option`.
 *
 * @tsplus fluent ets/Effect someWith
 */
export function someWith_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, Option<A>>,
  f: (effect: Effect<R, Option<E>, A>) => Effect<R1, Option<E1>, A1>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, Option<A1>> {
  return Effect.suspendSucceed(f(self.some).unsome());
}

/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Option`.
 *
 * @tsplus static ets/Effect/Aspects someWith
 */
export const someWith = Pipeable(someWith_);
