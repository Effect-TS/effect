/**
 * Checks whether the hub is currently empty.
 *
 * @tsplus fluent ets/Hub isEmpty
 */
export function isEmpty<A>(self: Hub<A>, __tsplusTrace?: string): Effect.UIO<boolean> {
  return self.size.map((n) => n === 0);
}
