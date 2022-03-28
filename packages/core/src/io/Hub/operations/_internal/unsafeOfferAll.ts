import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableQueue } from "../../../../support/MutableQueue"

/**
 * Unsafely offers the specified values to a queue.
 */
export function unsafeOfferAll<A>(queue: MutableQueue<A>, as: Iterable<A>): Chunk<A> {
  return queue.offerAll(as)
}
