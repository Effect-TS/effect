/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter effect/core/stm/TQueue isFull
 * @category getters
 * @since 1.0.0
 */
export function isFull<A>(self: TQueue<A>): USTM<boolean> {
  return self.size.map((size) => size === self.capacity)
}
