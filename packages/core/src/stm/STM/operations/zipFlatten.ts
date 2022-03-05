import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Sequentially zips this transactional effect with the that transactional
 * effect.
 *
 * @tsplus operator ets/STM +
 * @tsplus fluent ets/STM zipFlatten
 */
export function zipFlatten_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R2, E2, A2>>,
  __tsplusTrace?: string
): STM<R & R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWith(that, Tuple.mergeTuple)
}

/**
 * Sequentially zips this transactional effect with the that transactional
 * effect.
 *
 * @ets_data_first zipFlatten_
 */
export function zipFlatten<R2, E2, A2>(
  that: LazyArg<STM<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R2, E | E2, MergeTuple<A, A2>> =>
    self.zipFlatten(that)
}
