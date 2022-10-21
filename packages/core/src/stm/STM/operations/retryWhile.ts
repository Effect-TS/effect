/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns true for the value.
 *
 * @tsplus static effect/core/stm/STM.Aspects retryWhile
 * @tsplus pipeable effect/core/stm/STM retryWhile
 */
export function retryWhile<A>(f: Predicate<A>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> =>
    self.continueOrRetry(
      (a) => (f(a) ? Maybe.none : Maybe.some(a))
    )
}
