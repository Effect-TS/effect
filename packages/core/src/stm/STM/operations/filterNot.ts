import type { Chunk } from "../../../collection/immutable/Chunk"
import { STM } from "../definition"

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @tsplus static ets/STMOps filterNot
 */
export function filterNot<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk<A>> {
  return STM.filter(as, (x) => f(x).map((b) => !b))
}
