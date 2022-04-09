/**
 * Unsafely offers the specified values to a queue.
 */
export function unsafeOfferAll<A>(queue: MutableQueue<A>, as: Collection<A>): Chunk<A> {
  return queue.offerAll(as);
}
