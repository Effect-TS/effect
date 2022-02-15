import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Materializes a chunk into a chunk backed by an array. This method can
 * improve the performance of bulk operations.
 *
 * @tsplus fluent ets/Chunk materialize
 */
export function materialize<A>(self: Chunk<A>): Chunk<A> {
  return concreteId(self)._materialize()
}
