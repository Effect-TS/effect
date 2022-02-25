import type { LazyArg, Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Fails with `e` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrFail
 */
export function filterOrFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  predicate: Predicate<A>,
  e: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.filterOrElse(predicate, Effect.fail(e))
}

/**
 * Fails with `e` if the predicate fails.
 *
 * @ets_data_first filterOrFail_
 */
export function filterOrFail<E1, A>(
  predicate: Predicate<A>,
  e: LazyArg<E1>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A> =>
    self.filterOrFail(predicate, e)
}
