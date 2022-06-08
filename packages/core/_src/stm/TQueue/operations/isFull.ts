import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Checks if the queue is at capacity.
 *
 * @tsplus getter ets/TQueue isFull
 */
export function isFull<A>(self: TQueue<A>): USTM<boolean> {
  concreteTQueue(self)
  return self.size.map((size) => size === self.capacity)
}
