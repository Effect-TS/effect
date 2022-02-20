import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableQueue } from "../../../../support/MutableQueue"

/**
 * Offer items to the queue.
 */
export function unsafeOfferAll<A>(queue: MutableQueue<A>, as: Chunk<A>): Chunk<A> {
  return queue.offerAll(as)
}
