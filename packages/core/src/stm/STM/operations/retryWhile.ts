import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Filters the value produced by this effect, retrying the transaction while
 * the predicate returns true for the value.
 *
 * @tsplus static effect/core/stm/STM.Aspects retryWhile
 * @tsplus pipeable effect/core/stm/STM retryWhile
 * @category retrying
 * @since 1.0.0
 */
export function retryWhile<A>(f: Predicate<A>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> =>
    self.continueOrRetry(
      (a) => (f(a) ? Option.none : Option.some(a))
    )
}
