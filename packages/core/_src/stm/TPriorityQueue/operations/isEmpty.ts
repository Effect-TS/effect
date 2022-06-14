import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Checks whether the queue is empty.
 *
 * @tsplus getter ets/TPriorityQueue isEmpty
 */
export function isEmpty<A>(self: TPriorityQueue<A>): USTM<boolean> {
  concreteTPriorityQueue(self)
  return self.map.get.map((map) => map.isEmpty)
}
