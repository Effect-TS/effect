/**
 * Unsafely polls all values from a queue.
 */
export function unsafePollAllQueue<A>(queue: MutableQueue<A>): Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER);
}
