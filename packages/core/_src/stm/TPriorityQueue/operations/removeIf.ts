/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @tsplus fluent ets/TPriorityQueue removeIf
 */
export function removeIf_<A>(self: TPriorityQueue<A>, f: Predicate<A>): USTM<void> {
  return self.retainIf((a) => !f(a));
}

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @tsplus static ets/TPriorityQueue/Aspects removeIf
 */
export const removeIf = Pipeable(removeIf_);
