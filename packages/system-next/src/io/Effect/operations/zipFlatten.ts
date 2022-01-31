import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../definition"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets operator ets/Effect +
 * @ets fluent ets/Effect zipFlatten
 */
export function zipFlatten_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWith(that, Tuple.mergeTuple)
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets_data_first zipFlatten_
 */
export function zipFlatten<R2, E2, A2>(that: Effect<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, MergeTuple<A, A2>> =>
    zipFlatten_(self, that)
}
