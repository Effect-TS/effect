/**
 * Checks if the queue is empty.
 *
 * @tsplus getter ets/TQueue isEmpty
 */
export function isEmpty<A>(self: TQueue<A>): USTM<boolean> {
  return self.size.map((size) => size === 0)
}
