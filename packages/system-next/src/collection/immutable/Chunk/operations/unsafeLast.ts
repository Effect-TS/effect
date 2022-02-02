import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the last element of this chunk. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `last` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the last element of the chunk.
 *
 * @tsplus fluent ets/Chunk unsafeLast
 */
export function unsafeLast<A>(self: Chunk<A>): A {
  return concreteId(self)._get(concreteId(self).length - 1)
}
