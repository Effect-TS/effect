import type { Predicate } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { STM } from "../definition"

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
  return self.continueOrRetry((a) => (f(a) ? Option.some(a) : Option.none))
}

/**
 * Filters the value produced by this effect, retrying the transaction until
 * the predicate returns true for the value.
 *
 * @ets_data_first retryUntil_
 */
export function retryUntil<A>(f: Predicate<A>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.retryUntil(f)
}
