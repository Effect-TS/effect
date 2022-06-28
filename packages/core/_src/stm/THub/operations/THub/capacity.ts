import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * The maximum capacity of the hub.
 *
 * @tsplus getter effect/core/stm/THub capacity
 */
export function capacity<A>(
  self: THub<A>
): number {
  concreteTHub(self)
  return self.requestedCapacity
}
