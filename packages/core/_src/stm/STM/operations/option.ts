/**
 * Converts the failure channel into an `Maybe`.
 *
 * @tsplus getter ets/STM option
 */
export function option<R, E, A>(self: STM<R, E, A>): STM<R, never, Maybe<A>> {
  return self.fold(() => Maybe.none, Maybe.some)
}
