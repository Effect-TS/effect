// ets_tracing: off

import { suspend as suspendEffect } from "../../Effect/core.js"
import type { Managed } from "../managed.js"
import { managedApply } from "../managed.js"

/**
 * Suspends the creation of this effect
 */
export function suspend<R, E, A>(f: () => Managed<R, E, A>, __trace?: string) {
  return managedApply(suspendEffect(() => f().effect, __trace))
}
