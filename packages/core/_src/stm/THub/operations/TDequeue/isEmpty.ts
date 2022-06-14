/**
 * Checks if the queue is empty.
 *
 * @tsplus getter ets/THub/TDequeue isEmpty
 */
export function isEmpty<A>(self: THub.TDequeue<A>): USTM<boolean> {
  return self.size.map((size) => size === 0)
}
