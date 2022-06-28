import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Takes all values from the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue takeAll
 */
export function takeAll<A>(self: TPriorityQueue<A>): USTM<Chunk<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => Tuple(map.reduce(Chunk.empty<A>(), (acc, a) => acc + a), map))
}
