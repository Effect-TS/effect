import type { MutableList } from "../definition"
import { ListInternal } from "./_internal/ListInternal"

/**
 * Creates an empty `MutableList` which can have elements "pushed" into the
 * list.
 *
 * @tsplus static ets/MutableListOps emptyPushable
 */
export function emptyPushable<A>(): MutableList<A> {
  return new ListInternal(0, 0, 0, [], undefined, []) as any
}
