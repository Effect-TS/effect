import { Tuple } from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @tsplus fluent ets/Managed zip
 */
export function zip_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.zipWith(that, (a, a2) => Tuple(a, a2))
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 *
 * @ets_data_first zip_
 */
export function zip<R2, E2, A2>(that: Managed<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E2 | E, Tuple<[A, A2]>> =>
    zip_(self, that)
}
