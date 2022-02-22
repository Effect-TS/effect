import type { Chunk } from "../definition"
import { _Empty } from "../definition"

/**
 * Builds an empty chunk.
 *
 * @tsplus static ets/ChunkOps empty
 */
export function empty<A>(): Chunk<A> {
  return _Empty
}
