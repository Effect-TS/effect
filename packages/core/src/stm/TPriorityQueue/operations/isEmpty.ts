import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Checks whether the queue is empty.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue isEmpty
 * @category getters
 * @since 1.0.0
 */
export function isEmpty<A>(self: TPriorityQueue<A>): USTM<boolean> {
  concreteTPriorityQueue(self)
  return self.map.get.map(SortedMap.isEmpty)
}
