/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus fluent ets/STM someOrElseSTM
 */
export function someOrElseSTM_<R, E, A, R2, E2, B>(
  self: STM<R, E, Option<A>>,
  orElse: LazyArg<STM<R2, E2, B>>
): STM<R & R2, E | E2, A | B> {
  return (self as STM<R, E, Option<A | B>>).flatMap((option) => option.map(STM.succeedNow).getOrElse(orElse))
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static ets/STM/Aspects someOrElseSTM
 */
export const someOrElseSTM = Pipeable(someOrElseSTM_)
