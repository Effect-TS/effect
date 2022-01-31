import type { List } from "../definition"

/**
 * Invokes a given callback for each element in the list from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new list `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new list is unneeded.
 *
 * @complexity O(n)
 *
 * @tsplus fluent ets/List forEach
 */
export function forEach_<A>(self: List<A>, f: (a: A) => void): void {
  self.reduce(undefined as void, (_, a) => f(a))
}

/**
 * Invokes a given callback for each element in the list from left to
 * right. Returns `undefined`.
 *
 * This function is very similar to map. It should be used instead of
 * `map` when the mapping function has side-effects. Whereas `map`
 * constructs a new list `forEach` merely returns `undefined`. This
 * makes `forEach` faster when the new list is unneeded.
 *
 * @complexity O(n)
 * @ets_data_first forEach_
 */
export function forEach<A>(f: (a: A) => void) {
  return (self: List<A>): void => self.forEach(f)
}
