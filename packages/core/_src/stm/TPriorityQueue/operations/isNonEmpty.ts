import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Checks whether the queue is not empty.
 *
 * @tsplus fluent ets/TPriorityQueue isNonEmpty
 */
export function isNonEmpty<A>(self: TPriorityQueue<A>): USTM<boolean> {
  concreteTPriorityQueue(self)
  return self.map.get().map((map) => map.isNonEmpty())
}
