// ets_tracing: off

import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Create a managed that accesses the environment.
 */
export function environment<R>(__trace?: string) {
  return fromEffect(T.environment<R>(), __trace)
}
