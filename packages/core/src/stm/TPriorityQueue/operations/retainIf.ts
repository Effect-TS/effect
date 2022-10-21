import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects retainIf
 * @tsplus pipeable effect/core/stm/TPriorityQueue retainIf
 */
export function retainIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map.update((map) => map.map((chunk) => chunk.filter(f)))
  }
}
