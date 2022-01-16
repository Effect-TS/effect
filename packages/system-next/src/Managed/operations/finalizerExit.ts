// ets_tracing: off

import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect"
import { unit } from "./_internal/effect"
import type * as Ex from "./_internal/exit"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"

/**
 * Creates an effect that only executes the provided function as its
 * release action.
 */
export function finalizerExit<R, X>(
  f: (exit: Ex.Exit<any, any>) => Effect<R, never, X>,
  __trace?: string
): Managed<R, never, void> {
  return acquireReleaseExitWith_(unit, (_, e) => f(e), __trace)
}
