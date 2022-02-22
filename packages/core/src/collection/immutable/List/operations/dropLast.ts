import type { List } from "../definition"

/**
 * Returns a new list without the last `n` elements.
 *
 * @complexity `O(log(n))`
 * @tsplus fluent ets/List dropLast
 */
export function dropLast_<A>(self: List<A>, n: number): List<A> {
  return self.slice(0, self.length - n)
}

/**
 * Returns a new list without the last `n` elements.
 *
 * @complexity `O(log(n))`
 * @ets_data_first dropLast_
 */
export function dropLast<A>(n: number) {
  return (self: List<A>): List<A> => self.dropLast(n)
}
