import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Converts a chunk to an `ArrayLike` (either `Array` or `Buffer`).
 *
 * @tsplus fluent ets/Chunk toArrayLike
 */
export function toArrayLike<A>(self: Chunk<A>): ArrayLike<A> {
  return concreteId(self)._arrayLike()
}
