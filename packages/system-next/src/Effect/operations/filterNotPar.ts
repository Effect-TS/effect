import type { Effect } from "../definition"
import { filterPar_ } from "./filterPar"
import { map_ } from "./map"

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotPar_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
) {
  return filterPar_(as, (x) => map_(f(x), (b) => !b), __trace)
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @ets_data_first filterNotPar_
 */
export function filterNotPar<A, R, E>(
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
) {
  return (as: Iterable<A>) => filterNotPar_(as, f, __trace)
}
