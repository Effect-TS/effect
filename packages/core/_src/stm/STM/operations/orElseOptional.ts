/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects orElseOptional
 * @tsplus pipeable effect/core/stm/STM orElseOptional
 */
export function orElseOptional<R1, E1, A1>(that: LazyArg<STM<R1, Maybe<E1>, A1>>) {
  return <R, E, A>(self: STM<R, Maybe<E>, A>): STM<R | R1, Maybe<E | E1>, A | A1> =>
    self.catchAll((option) => option.fold(that, (e) => STM.fail(Maybe.some<E | E1>(e))))
}
