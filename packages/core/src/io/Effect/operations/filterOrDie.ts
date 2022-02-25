import type { LazyArg, Predicate } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrDie
 */
export function filterOrDie_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.filterOrElse(f, Effect.die(defect))
}

/**
 * Dies with specified defect if the predicate fails.
 *
 * @ets_data_first filterOrDie_
 */
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => self.filterOrDie(f, defect)
}
