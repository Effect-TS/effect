import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableQueue } from "../../../../support/MutableQueue"

/**
 * Unsafely polls all values from a queue.
 */
export function unsafePollAllQueue<A>(queue: MutableQueue<A>): Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}
