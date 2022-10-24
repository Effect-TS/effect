import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Returns the size of the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue size
 * @category getters
 * @since 1.0.0
 */
export function size<A>(self: TPriorityQueue<A>): USTM<number> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => [SortedMap.size(map), map])
}
