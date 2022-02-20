import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Reverse buckets iterator.
 *
 * @tsplus getter ets/Chunk reverseBuckets
 */
export function reverseBuckets<A>(self: Chunk<A>): Iterable<ArrayLike<A>> {
  return concreteId(self)._reverseBuckets()
}
