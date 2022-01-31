import { compact as chunkCompact } from "../../../collection/immutable/Chunk/api/compact"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/ManagedOps collectPar
 */
export function collectPar<A, R, E, B>(
  self: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk<B>> {
  return Managed.forEachPar(self, (a) => f(a).unsome()).map(chunkCompact)
}
