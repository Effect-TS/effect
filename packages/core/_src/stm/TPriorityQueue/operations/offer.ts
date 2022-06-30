import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Offers the specified value to the queue.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects offer
 * @tsplus pipeable effect/core/stm/TPriorityQueue offer
 */
export function offer<A>(value: A) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map.getAndUpdate((map) => map.set(value, Chunk.single(value))).map(() => STM.unit)
  }
}
