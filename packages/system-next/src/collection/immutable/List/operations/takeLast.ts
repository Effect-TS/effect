import type { List } from "../definition"

/**
 * Takes the last `n` elements from a list and returns them in a new
 * list.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List takeLast
 */
export function takeLast_<A>(self: List<A>, n: number): List<A> {
  return self.slice(self.length - n, self.length)
}

/**
 * Takes the last `n` elements from a list and returns them in a new
 * list.
 *
 * @complexity `O(log(n))`
 * @ets_data_first takeLast_
 */
export function takeLast<A>(n: number) {
  return (self: List<A>): List<A> => self.takeLast(n)
}
