import type { List } from "../definition"

/**
 * Inserts the given list of elements at the given index in the list.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List insertAll
 */
export function insertAll_<A>(
  self: List<A>,
  index: number,
  elements: List<A>
): List<A> {
  return self.slice(0, index) + elements + self.slice(index, self.length)
}

/**
 * Inserts the given list of elements at the given index in the list.
 *
 * @complexity `O(log(n))`
 * @ets_data_first insertAll_
 */
export function insertAll<A>(index: number, elements: List<A>) {
  return (self: List<A>): List<A> => self.insertAll(index, elements)
}
