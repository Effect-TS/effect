import type { List } from "../definition"

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @ets fluent ets/List unsafeNth
 */
export function unsafeNth_<A>(self: List<A>, index: number): A | undefined {
  return self.nth(index).value
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @ets_data_first unsafeNth_
 */
export function unsafeNth(index: number) {
  return <A>(self: List<A>): A | undefined => self.unsafeNth(index)
}
