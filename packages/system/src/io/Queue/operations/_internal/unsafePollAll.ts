import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableQueue } from "../../../../support/MutableQueue"

/**
 * Poll all items from the queue.
 */
export function unsafePollAll<A>(queue: MutableQueue<A>): Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}
