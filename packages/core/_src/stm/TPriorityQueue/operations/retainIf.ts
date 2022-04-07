import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus fluent ets/TPriorityQueue retainIf
 */
export function retainIf_<A>(self: TPriorityQueue<A>, f: Predicate<A>): USTM<void> {
  concreteTPriorityQueue(self);
  return self.map.update((sa) => sa.map(({ tuple: [_, chunk] }) => chunk.filter(f)) as SortedMap<A, Chunk<A>>);
}

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @tsplus static ets/TPriorityQueue/Aspects retainIf
 */
export const retainIf = Pipeable(retainIf_);
