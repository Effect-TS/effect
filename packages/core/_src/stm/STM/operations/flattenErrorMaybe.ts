/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static effect/core/stm/STM.Aspects flattenErrorMaybe
 * @tsplus pipeable effect/core/stm/STM flattenErrorMaybe
 */
export function flattenErrorMaybe<E2>(def: LazyArg<E2>) {
  return <R, E, A>(self: STM<R, Maybe<E>, A>): STM<R, E | E2, A> =>
    self.mapError((option) => option.fold(def, identity))
}
