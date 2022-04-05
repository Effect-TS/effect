import { concreteTPriorityQueue } from "@effect-ts/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue";

/**
 * Offers the specified value to the queue.
 *
 * @tsplus fluent ets/TPriorityQueue offer
 */
export function offer_<A>(self: TPriorityQueue<A>, a: A): USTM<void> {
  concreteTPriorityQueue(self);
  return self.map.getAndUpdate((map) => map.set(a, Chunk.single(a))).map(() => STM.unit);
}

/**
 * Offers the specified value to the queue.
 *
 * @tsplus static ets/TPriorityQueue/Aspects offer
 */
export const offer = Pipeable(offer_);
