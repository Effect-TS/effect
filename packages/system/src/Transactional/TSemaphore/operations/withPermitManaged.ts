// ets_tracing: off

import type { Managed } from "../../../Managed/index.js"
import type { TSemaphore } from "../definition.js"
import { withPermitsManaged_ } from "./withPermitsManaged.js"

/**
 * Returns a managed effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 */
export function withPermitManaged(
  self: TSemaphore,
  __trace?: string
): Managed<unknown, never, void> {
  return withPermitsManaged_(self, 1, __trace)
}
