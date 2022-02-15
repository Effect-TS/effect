import type { List } from "../definition"

/**
 * Returns `true` if the given argument is a list and `false`
 * otherwise.
 *
 * @complexity O(1)
 * @tsplus static ets/ListOps isList
 */
export function isList<A>(l: any): l is List<A> {
  return typeof l === "object" && Array.isArray(l.suffix)
}
