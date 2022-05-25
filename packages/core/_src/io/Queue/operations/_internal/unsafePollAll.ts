/**
 * Poll all items from the queue.
 */
export function unsafePollAll<A>(queue: MutableQueue<A>): Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}
