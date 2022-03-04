import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Collects all the transactional effects in a collection, returning a single
 * transactional effect that produces a collection of values.
 *
 * @tsplus static ets/STMOps collectAll
 */
export function collectAll<R, E, A>(
  as: LazyArg<Iterable<STM<R, E, A>>>
): STM<R, E, Chunk<A>> {
  return STM.forEach(as, identity)
}
