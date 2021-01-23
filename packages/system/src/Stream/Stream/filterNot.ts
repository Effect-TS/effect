import type { Predicate } from "../../Function"
import { not } from "../../Function"
import type { Stream } from "./definitions"
import { filter_ } from "./filter"

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
