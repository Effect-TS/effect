/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns true for the value.
 *
 * @tsplus static effect/core/stm/STM.Aspects retryUntil
 * @tsplus pipeable effect/core/stm/STM retryUntil
 */
export function retryUntil<A>(f: Predicate<A>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> =>
    self.continueOrRetry(
      (a) => (f(a) ? Maybe.some(a) : Maybe.none)
    )
}
