import { collect as chunkCollect } from "../../../collection/immutable/Chunk/api/collect"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static ets/ManagedOps collectAllWithPar
 */
export function collectAllWithPar<R, E, A, B>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  pf: (a: A) => Option<B>,
  __etsTrace?: string
): Managed<R, E, Chunk<B>> {
  return Managed.collectAllPar(as).map(chunkCollect(pf))
}
