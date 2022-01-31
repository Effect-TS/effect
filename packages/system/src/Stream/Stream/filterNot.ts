// ets_tracing: off

import type { Predicate } from "../../Function/index.js"
import { not } from "../../Function/index.js"
import type { Stream } from "./definitions.js"
import { filter_ } from "./filter.js"

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, O>(
  self: Stream<R, E, O>,
  pred: Predicate<O>
): Stream<R, E, O> {
  return filter_(self, not(pred))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot<O>(pred: Predicate<O>) {
  return <R, E>(self: Stream<R, E, O>) => filterNot_(self, pred)
}
