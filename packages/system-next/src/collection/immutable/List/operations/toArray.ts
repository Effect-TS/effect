import type { List } from "../definition"
import { arrayPush } from "./_internal/array"

/**
 * Converts a list into an array.
 *
 * @complexity `O(n)`
 * @ets fluent ets/List toArray
 */
export function toArray<A>(self: List<A>): ReadonlyArray<A> {
  return self.reduce<A, Array<A>>([], arrayPush)
}
