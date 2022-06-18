/**
 * Checks whether the hub is currently empty.
 *
 * @tsplus fluent ets/Hub isEmpty
 */
export function isEmpty<A>(self: Hub<A>, __tsplusTrace?: string): Effect<never, never, boolean> {
  return self.size.map((n) => n === 0)
}
