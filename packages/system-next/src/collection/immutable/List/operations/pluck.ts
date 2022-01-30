import type { List } from "../definition"

/**
 * Extracts the specified property from each object in the list.
 *
 * @ets fluent ets/List pluck
 */
export function pluck_<A, K extends keyof A>(self: List<A>, key: K): List<A[K]> {
  return self.map((a) => a[key])
}

/**
 * Extracts the specified property from each object in the list.
 *
 * @ets_data_first pluck_
 */
export function pluck<A, K extends keyof A>(key: K) {
  return (self: List<A>): List<A[K]> => self.pluck(key)
}
