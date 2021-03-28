import * as R from "../../Effect/runtime"
import { fromEffect } from "../fromEffect"
import type { Managed } from "../managed"

/**
 * Returns an Managed that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy
 * code that must call back into Effect code.
 */
export function runtime<R>(
  __trace?: string
): Managed<R, never, R.CustomRuntime<R, unknown>> {
  return fromEffect(R.runtime<R>(), __trace)
}
