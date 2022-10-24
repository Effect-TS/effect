/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue isFull
 * @category getters
 * @since 1.0.0
 */
export function isFull<A>(self: THub.TDequeue<A>): STM<never, never, boolean> {
  return self.size.map((size) => size === self.capacity)
}
