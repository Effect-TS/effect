import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Returns the size of the queue.
 *
 * @tsplus getter ets/TPriorityQueue size
 */
export function size<A>(self: TPriorityQueue<A>): USTM<number> {
  concrete(self)
  return self.map.modify((map) => Tuple(SortedMap.size(map), map))
}
