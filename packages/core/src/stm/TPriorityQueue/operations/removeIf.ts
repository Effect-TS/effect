import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects removeIf
 * @tsplus pipeable effect/core/stm/TPriorityQueue removeIf
 * @category mutations
 * @since 1.0.0
 */
export function removeIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => self.retainIf((a) => !f(a))
}
