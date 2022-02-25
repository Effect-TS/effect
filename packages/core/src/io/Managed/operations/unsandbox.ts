import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * The inverse operation to `sandbox`. Submerges the full cause of failure.
 *
 * @tsplus fluent ets/Managed unsandbox
 */
export function unsandbox<R, E, A>(
  self: Managed<R, Cause<E>, A>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed.suspend(self.catchAll(Managed.failCauseNow))
}
