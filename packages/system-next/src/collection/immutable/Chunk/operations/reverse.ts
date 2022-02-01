import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Reverse buckets iterator.
 *
 * @tsplus fluent ets/Chunk reverse
 */
export function reverse<A>(self: Chunk<A>): Iterable<A> {
  return concreteId(self)._reverse()
}
