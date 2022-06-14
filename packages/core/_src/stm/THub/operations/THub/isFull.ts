import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * Checks if the hub is at capacity.
 *
 * @tsplus getter ets/THub isFull
 */
export function isFull<A>(self: THub<A>): USTM<boolean> {
  concreteTHub(self)
  return self.size.map((size) => size === self.capacity)
}
