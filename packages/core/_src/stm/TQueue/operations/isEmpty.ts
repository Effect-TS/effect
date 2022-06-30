/**
 * Checks if the queue is empty.
 *
 * @tsplus getter effect/core/stm/TQueue isEmpty
 */
export function isEmpty<A>(self: TQueue<A>): USTM<boolean> {
  return self.size.map((size) => size === 0)
}
