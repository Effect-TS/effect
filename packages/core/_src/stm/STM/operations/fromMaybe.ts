/**
 * Lifts an `Maybe` into a `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops fromMaybe
 */
export function fromMaybe<A>(option: Maybe<A>): STM<never, Maybe<never>, A> {
  return STM.suspend(option.fold(STM.failSync(Maybe.none), STM.succeed))
}
