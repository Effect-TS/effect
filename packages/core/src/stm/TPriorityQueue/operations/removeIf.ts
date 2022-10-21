/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Aspects removeIf
 * @tsplus pipeable effect/core/stm/TPriorityQueue removeIf
 */
export function removeIf<A>(f: Predicate<A>) {
  return (self: TPriorityQueue<A>): STM<never, never, void> => self.retainIf((a) => !f(a))
}
