import type { List } from "../definition"

/**
 * Inserts the given element at the given index in the list.
 *
 * @complexity O(log(n))
 * @tsplus fluent ets/List insert
 */
export function insert_<A>(self: List<A>, index: number, element: A): List<A> {
  return self.slice(0, index).append(element) + self.slice(index, self.length)
}

/**
 * Inserts the given element at the given index in the list.
 *
 * @complexity O(log(n))
 * @ets_data_first insert_
 */
export function insert<A>(index: number, element: A) {
  return (self: List<A>): List<A> => self.insert(index, element)
}
