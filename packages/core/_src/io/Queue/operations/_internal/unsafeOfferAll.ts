/**
 * Offer items to the queue.
 */
export function unsafeOfferAll<A>(queue: MutableQueue<A>, as: Chunk<A>): Chunk<A> {
  return queue.offerAll(as)
}
