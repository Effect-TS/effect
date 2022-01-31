// ets_tracing: off

import type { Predicate, Refinement } from "../../../../Function/index.js"
import type * as C from "../core.js"
import * as Filter from "./filter.js"

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, A, B extends A>(
  self: C.Stream<R, E, A>,
  pred: Refinement<A, B>
): C.Stream<R, E, B>
export function filterNot_<R, E, A>(
  self: C.Stream<R, E, A>,
  pred: Predicate<A>
): C.Stream<R, E, A>
export function filterNot_<R, E, A>(
  self: C.Stream<R, E, A>,
  pred: Predicate<A>
): C.Stream<R, E, A> {
  return Filter.filter_(self, (a) => !pred(a))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 *
 * @ets_data_first filterNot_
 */
export function filterNot<A, B extends A>(
  pred: Refinement<A, B>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, B>
export function filterNot<A>(
  pred: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A>
export function filterNot<A>(
  pred: Predicate<A>
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R, E, A> {
  return <R, E>(self: C.Stream<R, E, A>) => filterNot_(self, pred)
}
