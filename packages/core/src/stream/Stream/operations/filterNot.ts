import type { Predicate, Refinement } from "../../../data/Function"
import type { Stream } from "../definition"

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 *
 * @tsplus fluent ets/Stream filterNot
 */
export function filterNot_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  pred: Refinement<A, B>,
  __tsplusTrace?: string
): Stream<R, E, B>
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  pred: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A>
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  pred: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.filter((a) => !pred(a))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export const filterNot = Pipeable(filterNot_)
