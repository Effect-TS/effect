import * as Tp from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import { zipWith_ } from "./zipWith"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function zip_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return zipWith_(self, that, (a, a2) => Tp.tuple(a, a2), __trace)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @ets_data_first zip_
 */
export function zip<R2, E2, A2>(that: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<R & R2, E2 | E, Tp.Tuple<[A, A2]>> => zip_(self, that, __trace)
}
