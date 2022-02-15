import { ArrayIndexOutOfBoundsException } from "../../../../data/GlobalExceptions"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns every elements after the first. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `head` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the first element of the chunk.
 *
 * @tsplus fluent ets/Chunk unsafeTail
 */
export function unsafeTail<A>(self: Chunk<A>): Chunk<A> {
  if (concreteId(self).length === 0) {
    throw new ArrayIndexOutOfBoundsException(1)
  }
  return self.drop(1)
}
