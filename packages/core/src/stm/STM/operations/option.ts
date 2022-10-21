/**
 * Converts the failure channel into an `Maybe`.
 *
 * @tsplus getter effect/core/stm/STM option
 */
export function option<R, E, A>(self: STM<R, E, A>): STM<R, never, Maybe<A>> {
  return self.fold(() => Maybe.none, Maybe.some)
}
