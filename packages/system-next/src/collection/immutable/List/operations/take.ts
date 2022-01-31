import type { List } from "../definition"

/**
 * Takes the first `n` elements from a list and returns them in a new list.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List take
 */
export function take_<A>(self: List<A>, n: number): List<A> {
  return self.slice(0, n)
}

/**
 * Takes the first `n` elements from a list and returns them in a new list.
 *
 * @complexity `O(log(n))`
 * @ets_data_first take_
 */
export function take(n: number) {
  return <A>(self: List<A>): List<A> => self.take(n)
}
