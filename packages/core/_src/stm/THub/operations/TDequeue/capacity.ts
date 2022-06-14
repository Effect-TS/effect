import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 *  The maximum capacity of the queue.
 *
 * @tsplus getter ets/THub/TDequeue capacity
 */
export function capacity<A>(
  self: THub.TDequeue<A>
): number {
  concreteTDequeue(self)
  return self.requestedCapacity
}
