import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects offerAll
 * @tsplus pipeable effect/core/stm/TPriorityQueue offerAll
 */
export function offerAll<A>(values: Collection<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map
      .getAndUpdate((sa) =>
        values.reduce(
          SortedMap.empty<A, Chunk<A>>(sa.getOrd),
          (map, a) => map.set(a, Chunk.single(a))
        )
      )
      .unit
  }
}
