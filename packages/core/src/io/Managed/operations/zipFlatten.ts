import * as Tp from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"

/**
 * Sequentially zips this managed resource with the specified managed
 * resource.
 *
 * @tsplus fluent ets/Managed zipFlatten
 * @tsplus operator ets/Managed +
 */
export function zipFlatten_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, Tp.MergeTuple<A, A2>> {
  return self.zipWith(that, Tp.mergeTuple)
}

/**
 * Sequentially zips this managed resource with the specified managed
 * resource.
 *
 * @ets_data_first zipFlatten_
 */
export function zipFlatten<R2, E2, A2>(that: Managed<R2, E2, A2>, __tsplusTrace?: string) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<R & R2, E | E2, Tp.MergeTuple<A, A2>> => zipFlatten_(self, that)
}
