/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter effect/core/stm/TQueue isFull
 */
export function isFull<A>(self: TQueue<A>): USTM<boolean> {
  return self.size.map((size) => size === self.capacity)
}
