/**
 * Converts the failure channel into an `Option`.
 *
 * @tsplus fluent ets/STM option
 */
export function option<R, E, A>(self: STM<R, E, A>): STM<R, never, Option<A>> {
  return self.fold(() => Option.none, Option.some);
}
