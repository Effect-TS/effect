import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * The maximum capacity of the hub.
 *
 * @tsplus getter effect/core/stm/THub capacity
 * @category getters
 * @since 1.0.0
 */
export function capacity<A>(
  self: THub<A>
): number {
  concreteTHub(self)
  return self.requestedCapacity
}
