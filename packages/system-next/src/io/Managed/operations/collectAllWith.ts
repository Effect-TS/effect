import { collect as chunkCollect } from "../../../collection/immutable/Chunk/api/collect"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets static ets/ManagedOps collectAllWith
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  pf: (a: A) => Option<B>,
  __etsTrace?: string
): Managed<R, E, Chunk<B>> {
  return Managed.collectAll(as).map(chunkCollect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => Option<B>, __etsTrace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, Chunk<B>> =>
    collectAllWith_(as, pf)
}
