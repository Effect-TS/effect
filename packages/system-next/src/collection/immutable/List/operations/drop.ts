import type { List } from "../definition"

/**
 * Returns a new list without the first `n` elements.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List drop
 */
export function drop_<A>(self: List<A>, n: number): List<A> {
  return self.slice(n, self.length)
}

/**
 * Returns a new list without the first `n` elements.
 *
 * @complexity `O(log(n))`
 * @ets_data_first drop_
 */
export function drop(n: number) {
  return <A>(self: List<A>): List<A> => self.drop(n)
}
