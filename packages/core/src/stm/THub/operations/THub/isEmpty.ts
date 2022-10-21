/**
 * Checks if the hub is empty.
 *
 * @tsplus getter effect/core/stm/THub isEmpty
 */
export function isEmpty<A>(self: THub<A>): USTM<boolean> {
  return self.size.map((size) => size === 0)
}
