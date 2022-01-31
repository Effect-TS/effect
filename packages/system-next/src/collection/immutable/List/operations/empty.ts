import type { List } from "../definition"
import { emptyAffix } from "./_internal/array"
import { ListInternal } from "./_internal/ListInternal"

/**
 * Creates an empty list.
 *
 * @complexity O(1)
 * @tsplus static ets/ListOps empty
 */
export function empty<A = any>(): List<A> {
  return new ListInternal(0, 0, 0, emptyAffix, undefined, emptyAffix)
}
