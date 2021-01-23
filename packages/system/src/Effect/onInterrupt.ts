import type { FiberID } from "../Fiber/id"
import type { Effect } from "./effect"
import { onInterrupt_ } from "./onInterrupt_"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export function onInterrupt<R2>(
  cleanup: (interruptors: ReadonlySet<FiberID>) => Effect<R2, never, any>
) {
  return <R, E, A>(self: Effect<R, E, A>) => onInterrupt_(self, cleanup)
}
