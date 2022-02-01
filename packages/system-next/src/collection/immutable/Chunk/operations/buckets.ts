import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Buckets iterator.
 *
 * @tsplus getter ets/Chunk buckets
 */
export function buckets<A>(self: Chunk<A>): Iterable<ArrayLike<A>> {
  return concreteId(self)._buckets()
}
