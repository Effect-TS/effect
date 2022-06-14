/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter ets/THub/TDequeue isFull
 */
export function isFull<A>(self: THub.TDequeue<A>): USTM<boolean> {
  return self.size.map((size) => size === self.capacity)
}
