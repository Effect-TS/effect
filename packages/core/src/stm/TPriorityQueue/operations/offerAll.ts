import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects offerAll
 * @tsplus pipeable effect/core/stm/TPriorityQueue offerAll
 * @category mutations
 * @since 1.0.0
 */
export function offerAll<A>(values: Iterable<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map
      .getAndUpdate((sa) =>
        Array.from(values).reduce(
          (map, a) => pipe(map, SortedMap.set(a, Chunk.single(a))),
          SortedMap.empty<A, Chunk.Chunk<A>>(SortedMap.getOrder(sa))
        )
      ).as(STM.unit)
  }
}
