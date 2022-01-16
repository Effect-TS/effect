// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { catchAll_ } from "./catchAll"
import { failCause } from "./failCause"
import { suspend } from "./suspend"

/**
 * The inverse operation to `sandbox`. Submerges the full cause of failure.
 */
export function unsandbox<R, E, A>(
  self: Managed<R, Cause<E>, A>,
  __trace?: string
): Managed<R, E, A> {
  return suspend(() => catchAll_(self, failCause, __trace))
}
