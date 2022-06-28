/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrElse
 * @tsplus pipeable effect/core/stm/STM someOrElse
 */
export function someOrElse<B>(orElse: LazyArg<B>) {
  return <R, E, A>(self: STM<R, E, Maybe<A>>): STM<R, E, A | B> =>
    self.map(
      (option) => option.getOrElse(orElse)
    )
}
