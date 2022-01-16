// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { sandbox } from "./sandbox"
import { unsandbox } from "./unsandbox"

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (_: Managed<R, Cause<E>, A>) => Managed<R2, Cause<E2>, A2>,
  __trace?: string
): Managed<R2, E2, A2> {
  return unsandbox(f(sandbox(self)), __trace)
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @ets_data_first sandboxWith_
 */
export function sandboxWith<R, E, A, R2, E2, A2>(
  f: (_: Managed<R, Cause<E>, A>) => Managed<R2, Cause<E2>, A2>,
  __trace?: string
) {
  return (self: Managed<R, E, A>): Managed<R2, E2, A2> => sandboxWith_(self, f, __trace)
}
