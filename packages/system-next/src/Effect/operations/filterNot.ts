import type { Effect } from "../definition"
import { filter_ } from "./filter"
import { map_ } from "./map"

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @ets static ets/EffectOps filterNot
 */
export function filterNot_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
) {
  return filter_(as, (x) => map_(f(x), (b) => !b), __trace)
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @ets_data_first filterNot_
 */
export function filterNot<A, R, E>(
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
) {
  return (as: Iterable<A>) => filterNot_(as, f, __trace)
}
