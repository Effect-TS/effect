import type { LazyArg, Predicate } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrElse
 */
export function filterOrElse_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  predicate: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __etsTrace?: string
): Effect<R & R1, E | E1, A | A1> {
  return self.filterOrElseWith(predicate, effect)
}

/**
 * Applies `f` if the predicate fails.
 *
 * @ets_data_first filterOrElse_
 */
export function filterOrElse<A, R1, E1, A1>(
  predicate: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A | A1> =>
    self.filterOrElse(predicate, effect)
}
