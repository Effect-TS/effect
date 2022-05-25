/**
 * Poll `n` items from the queue.
 */
export function unsafePollN<A>(queue: MutableQueue<A>, max: number): Chunk<A> {
  return queue.pollUpTo(max)
}
