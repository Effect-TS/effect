import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"

/**
 * Sequentially zips this sync with the specified sync
 *
 * @tsplus operator ets/Sync +
 * @tsplus fluent ets/Sync zipFlatten
 */
export function zipFlatten_<R, E, A, R2, E2, A2>(
  self: Sync<R, E, A>,
  that: LazyArg<Sync<R2, E2, A2>>,
  __tsplusTrace?: string
): Sync<R & R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWith(that, Tuple.mergeTuple)
}

/**
 * Sequentially zips this sync with the specified sync
 *
 * @ets_data_first zipFlatten_
 */
export function zipFlatten<R2, E2, A2>(
  that: LazyArg<Sync<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Sync<R, E, A>): Sync<R & R2, E | E2, MergeTuple<A, A2>> =>
    self.zipFlatten(that)
}
