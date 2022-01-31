import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import { Managed } from "../definition"

/**
 * Creates an effect that only executes the provided function as its
 * release action.
 *
 * @ets static ets/ManagedOps finalizerExit
 */
export function finalizerExit<R, X>(
  f: (exit: Exit<any, any>) => Effect<R, never, X>,
  __etsTrace?: string
): Managed<R, never, void> {
  return Managed.acquireReleaseExitWith(Effect.unit, (_, e) => f(e))
}
