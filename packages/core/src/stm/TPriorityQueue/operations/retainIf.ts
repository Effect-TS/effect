import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"
import * as SortedMap from "@fp-ts/data/SortedMap"
/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects retainIf
 * @tsplus pipeable effect/core/stm/TPriorityQueue retainIf
 * @category mutations
 * @since 1.0.0
 */
export function retainIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => {
    concreteTPriorityQueue(self)
    return self.map.update(SortedMap.map(Chunk.filter(f)))
  }
}
