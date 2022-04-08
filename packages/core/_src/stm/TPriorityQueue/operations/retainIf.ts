import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus fluent ets/TPriorityQueue retainIf
 */
export function retainIf_<A>(self: TPriorityQueue<A>, f: Predicate<A>): USTM<void> {
  concreteTPriorityQueue(self);
  return self.map.update((map) => map.map((chunk) => chunk.filter(f)));
}

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus static ets/TPriorityQueue/Aspects retainIf
 */
export const retainIf = Pipeable(retainIf_);
