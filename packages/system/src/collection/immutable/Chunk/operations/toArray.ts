import type { Array } from "../../Array"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Converts a chunk to an `Array`.
 *
 * @tsplus fluent ets/Chunk toArray
 */
export function toArray<A>(self: Chunk<A>): Array<A> {
  return concreteId(self)._array()
}
