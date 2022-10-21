/**
 * Checks if the queue is empty.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue isEmpty
 */
export function isEmpty<A>(self: THub.TDequeue<A>): STM<never, never, boolean> {
  return self.size.map((size) => size === 0)
}
