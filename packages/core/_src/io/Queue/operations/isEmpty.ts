/**
 * Checks whether the queue is currently empty.
 *
 * @tsplus fluent ets/Queue isEmpty
 */
export function isEmpty<A>(self: Queue<A>, __tsplusTrace?: string): Effect.UIO<boolean> {
  return self.size.map((size) => size === 0)
}
