// ets_tracing: off

import type { Managed } from "../definition"
import { environment } from "./environment"
import { map_ } from "./map"

/**
 * Create a managed that accesses the environment.
 */
export function environmentWith<R0, A>(
  f: (_: R0) => A,
  __trace?: string
): Managed<R0, never, A> {
  return map_(environment<R0>(), f, __trace)
}
