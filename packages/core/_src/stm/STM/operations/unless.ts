/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus fluent ets/STM unless
 */
export function unless_<R, E, A>(
  self: STM<R, E, A>,
  predicate: LazyArg<boolean>
): STM<R, E, Maybe<A>> {
  return STM.suspend(predicate() ? STM.none : self.asSome)
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static ets/STM/Aspects unless
 */
export const unless = Pipeable(unless_)
