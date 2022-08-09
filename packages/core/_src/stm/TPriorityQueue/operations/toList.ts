import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Collects all values into a List.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toList
 */
export function toList<A>(self: TPriorityQueue<A>): USTM<List<A>> {
  concreteTPriorityQueue(self)
  return self.toChunk.map((_) => _.toList)
}
