import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Sync } from "../definition"

/**
 * Evaluate each Sync in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static ets/SyncOps collectAllWith
 */
export function collectAllWith<R, E, A, B>(
  as: LazyArg<Iterable<Sync<R, E, A>>>,
  pf: (a: A) => Option<B>,
  __trace?: string
): Sync<R, E, Chunk<B>> {
  return Sync.collectAll(as).map((chunk) => chunk.collect(pf))
}
