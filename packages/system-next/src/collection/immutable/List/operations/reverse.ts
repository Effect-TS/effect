import { List } from "../definition"

/**
 * Reverses a list.
 *
 * @complexity O(n)
 * @ets fluent ets/List reverse
 */
export function reverse<A>(self: List<A>): List<A> {
  return self.reduce(List.empty(), (newL, element) => newL.prepend(element))
}
