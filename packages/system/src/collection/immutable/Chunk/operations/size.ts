import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the number of elements in the chunk.
 *
 * @tsplus getter ets/Chunk size
 */
export function size<A>(self: Chunk<A>) {
  return concreteId(self).length
}
