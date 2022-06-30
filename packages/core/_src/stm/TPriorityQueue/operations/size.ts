import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Returns the size of the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue size
 */
export function size<A>(self: TPriorityQueue<A>): USTM<number> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => Tuple(map.size, map))
}
