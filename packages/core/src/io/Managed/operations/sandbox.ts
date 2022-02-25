import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * Exposes the full cause of failure of this effect.
 *
 * @tsplus fluent ets/Managed sandbox
 */
export function sandbox<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, Cause<E>, A> {
  return Managed(self.effect.sandbox())
}
