import type { Exit } from "../../Exit"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A more powerful variant of `withFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus fluent ets/Effect withFinalizerExit
 */
export function withFinalizerExit_<R, R2, E, A, X>(
  self: Effect<R, E, A>,
  finalizer: (exit: Exit<unknown, unknown>) => RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E, A> {
  return Effect.acquireReleaseExit(self, (_, exit) => finalizer(exit))
}

/**
 * A more powerful variant of `withFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 */
export const withFinalizerExit = Pipeable(withFinalizerExit_)
