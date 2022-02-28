import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Option } from "../../../data/Option"
import { Sync } from "../definition"

/**
 * Evaluate each Sync in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/SyncOps collect
 */
export function collect<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Sync<R, Option<E>, B>
): Sync<R, E, Chunk<B>> {
  return Sync.forEach(self, (a) => f(a).optional()).map((chunk) => chunk.compact())
}
