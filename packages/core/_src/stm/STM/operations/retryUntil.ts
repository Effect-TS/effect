/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns true for the value.
 *
 * @tsplus fluent ets/STM retryUntil
 */
export function retryUntil_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>
): STM<R, E, A> {
  return self.continueOrRetry((a) => (f(a) ? Option.some(a) : Option.none));
}

/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns true for the value.
 *
 * @tsplus static ets/STM/Aspects retryUntil
 */
export const retryUntil = Pipeable(retryUntil_);
