import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter ets/TQueue capacity
 */
export function capacity<A>(self: TQueue<A>): number {
  concreteTQueue(self)
  return self.capacity
}
