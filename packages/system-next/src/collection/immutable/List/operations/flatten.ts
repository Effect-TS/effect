import { List } from "../definition"

/**
 * Flattens a list of lists into a list. Note that this function does
 * not flatten recursively. It removes one level of nesting only.
 *
 * @complexity O(n * log(m)), where n is the length of the outer list and m the
 * length of the inner lists.
 * @ets fluent ets/List flatten
 */
export function flatten<A>(self: List<List<A>>): List<A> {
  return self.reduce(List.empty(), (a, b) => a + b)
}
