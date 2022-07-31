/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrElseSTM
 * @tsplus pipeable effect/core/stm/STM someOrElseSTM
 */
export function someOrElseSTM<R2, E2, B>(orElse: LazyArg<STM<R2, E2, B>>) {
  return <R, E, A>(self: STM<R, E, Maybe<A>>): STM<R | R2, E | E2, A | B> =>
    (self as STM<R, E, Maybe<A | B>>).flatMap((option) =>
      option.map(STM.succeedNow).getOrElse(orElse)
    )
}
