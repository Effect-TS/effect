/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns true for the value.
 *
 * @tsplus fluent ets/STM retryWhile
 */
export function retryWhile_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>
): STM<R, E, A> {
  return self.continueOrRetry((a) => (f(a) ? Maybe.none : Maybe.some(a)))
}

/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns true for the value.
 *
 * @ets_data_first retryWhile_
 */
export const retryWhile = Pipeable(retryWhile_)
