/**
 * Checks if the hub is empty.
 *
 * @tsplus getter ets/THub isEmpty
 */
export function isEmpty<A>(self: THub<A>): USTM<boolean> {
  return self.size.map((size) => size === 0)
}
