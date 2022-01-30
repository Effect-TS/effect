import type { List } from "../definition"

/**
 * Takes an index, a number of elements to remove and a list. Returns a
 * new list with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List remove
 */
export function remove_<A>(self: List<A>, from: number, amount: number): List<A> {
  return self.slice(0, from) + self.slice(from + amount, self.length)
}

/**
 * Takes an index, a number of elements to remove and a list. Returns a
 * new list with the given amount of elements removed from the specified
 * index.
 *
 * @complexity `O(log(n))`
 * @ets_data_first remove_
 */
export function remove(from: number, amount: number) {
  return <A>(self: List<A>): List<A> => self.remove(from, amount)
}
