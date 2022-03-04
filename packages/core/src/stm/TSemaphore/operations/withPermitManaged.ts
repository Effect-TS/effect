import type { Managed } from "../../../io/Managed"
import type { TSemaphore } from "../definition"

/**
 * Returns a managed effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus fluent ets/TSemaphore withPermitManaged
 */
export function withPermitManaged(
  self: TSemaphore,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return self.withPermitsManaged(1)
}
