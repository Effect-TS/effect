import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { TSemaphore } from "../definition"

/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @tsplus fluent ets/TSemaphore withPermitScoped
 */
export function withPermitScoped(
  self: TSemaphore,
  __tsplusTrace?: string
): Effect<HasScope, never, void> {
  return self.withPermitsScoped(1)
}
