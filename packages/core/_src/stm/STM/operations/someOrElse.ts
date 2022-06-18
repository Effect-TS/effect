/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/STM someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: STM<R, E, Maybe<A>>,
  orElse: LazyArg<B>
): STM<R, E, A | B> {
  return self.map((option) => option.getOrElse(orElse))
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static ets/STM/Aspects someOrElse
 */
export const someOrElse = Pipeable(someOrElse_)
