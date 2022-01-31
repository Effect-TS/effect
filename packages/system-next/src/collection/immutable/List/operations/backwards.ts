import type { List } from "../definition"
import { BackwardsListIterator } from "./_internal/ListIterator"

/**
 * Returns an iterable that iterates backwards over the given list.
 *
 * @complexity O(1)
 * @ets fluent ets/List backwards
 */
export function backwards<A>(self: List<A>): Iterable<A> {
  return {
    [Symbol.iterator](): Iterator<A> {
      return new BackwardsListIterator(self)
    }
  }
}
