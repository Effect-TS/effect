import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Checks whether the queue is not empty.
 *
 * @tsplus fluent ets/TPriorityQueue isNonEmpty
 */
export function isNonEmpty<A>(self: TPriorityQueue<A>): USTM<boolean> {
  concrete(self)
  return self.map.get().map(SortedMap.nonEmpty)
}
