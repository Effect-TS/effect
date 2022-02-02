// ets_tracing: off

import { suspend as suspendEffect } from "../../Effect/core"
import type { Managed } from "../managed"
import { managedApply } from "../managed"

/**
 * Suspends the creation of this effect
 */
export function suspend<R, E, A>(f: () => Managed<R, E, A>, __trace?: string) {
  return managedApply(suspendEffect(() => f().effect, __trace))
}
