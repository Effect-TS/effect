import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Checks whether the queue is empty.
 *
 * @tsplus fluent ets/TPriorityQueue isEmpty
 */
export function isEmpty<A>(self: TPriorityQueue<A>): USTM<boolean> {
  concrete(self)
  return self.map.get().map(SortedMap.isEmpty)
}
