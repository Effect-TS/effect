/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus static effect/core/stm/STM.Aspects unless
 * @tsplus pipeable effect/core/stm/STM unless
 */
export function unless(predicate: LazyArg<boolean>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, Maybe<A>> =>
    STM.suspend(
      predicate() ? STM.none : self.asSome
    )
}
