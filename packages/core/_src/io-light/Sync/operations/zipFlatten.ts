import type { MergeTuple } from "@tsplus/stdlib/data/Tuple";

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
  return self.zipWith(that, Tuple.mergeTuple);
}

/**
 * Sequentially zips this sync with the specified sync
 *
 * @tsplus static ets/Sync/Aspects zipFlatten
 */
export const zipFlatten = Pipeable(zipFlatten_);
