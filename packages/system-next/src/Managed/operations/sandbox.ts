import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, Cause<E>, A> {
  return managedApply(T.sandbox(self.effect, __trace))
}
