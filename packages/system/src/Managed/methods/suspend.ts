// ets_tracing: off

import { suspend as suspendEffect } from "../../Effect/core"
import { Managed } from "../managed"

/**
 * Suspends the creation of this effect
 */
export function suspend<R, E, A>(f: () => Managed<R, E, A>, __trace?: string) {
  return new Managed(suspendEffect(() => f().effect, __trace))
}
