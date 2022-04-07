import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @tsplus fluent ets/TPriorityQueue offerAll
 */
export function offerAll_<A>(self: TPriorityQueue<A>, values: LazyArg<Collection<A>>): USTM<void> {
  concreteTPriorityQueue(self);
  return self.map
    .getAndUpdate((sa) =>
      values().reduce(
        SortedMap.empty<A, Chunk<A>>(sa.getOrd()),
        (map, a) => map.set(a, Chunk.single(a))
      )
    )
    .map(() => STM.unit);
}

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @tsplus static ets/TPriorityQueue/Aspects offerAll
 */
export const offerAll = Pipeable(offerAll_);
