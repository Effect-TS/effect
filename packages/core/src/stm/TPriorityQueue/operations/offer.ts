import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Offers the specified value to the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects offer
 * @tsplus pipeable effect/core/stm/TPriorityQueue offer
 * @category mutations
 * @since 1.0.0
 */
export function offer<A>(value: A) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map.getAndUpdate(SortedMap.set(value, Chunk.single(value))).map(() => STM.unit)
  }
}
