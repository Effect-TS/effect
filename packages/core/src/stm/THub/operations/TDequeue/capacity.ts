import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 *  The maximum capacity of the queue.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue capacity
 * @category getters
 * @since 1.0.0
 */
export function capacity<A>(
  self: THub.TDequeue<A>
): number {
  concreteTDequeue(self)
  return self.requestedCapacity
}
