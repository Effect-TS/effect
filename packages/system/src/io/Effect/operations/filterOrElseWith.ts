import type { Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrElseWith
 */
export function filterOrElseWith_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  predicate: Predicate<A>,
  f: (a: A) => Effect<R1, E1, A1>,
  __etsTrace?: string
): Effect<R & R1, E | E1, A | A1> {
  return self.flatMap((a) => (predicate(a) ? f(a) : Effect.succeedNow(a)))
}

/**
 * Applies `f` if the predicate fails.
 *
 * @ets_data_first filterOrElseWith_
 */
export function filterOrElseWith<A, R1, E1, A1>(
  predicate: Predicate<A>,
  f: (a: A) => Effect<R1, E1, A1>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A | A1> =>
    self.filterOrElseWith(predicate, f)
}
