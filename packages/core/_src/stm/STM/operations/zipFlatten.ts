import type { MergeTuple } from "@tsplus/stdlib/data/Tuple";

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
  return self.zipWith(that, Tuple.mergeTuple);
}

/**
 * Sequentially zips this transactional effect with the that transactional
 * effect.
 *
 * @tsplus static ets/STM/Aspects zipFlatten
 */
export const zipFlatten = Pipeable(zipFlatten_);
