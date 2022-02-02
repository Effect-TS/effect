import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the first element of this chunk. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `head` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the first element of the chunk.
 *
 * @tsplus fluent ets/Chunk unsafeHead
 */
export function unsafeHead<A>(self: Chunk<A>): A {
  return concreteId(self)._get(0)
}
