// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import type { Effect } from "./effect.js"
import { sandbox } from "./sandbox.js"
import { unsandbox } from "./unsandbox.js"

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @ets_data_first sandboxWith_
 */
export function sandboxWith<R, E, A, E2>(
  f: (_: Effect<R, Cause<E>, A>) => Effect<R, Cause<E2>, A>,
  __trace?: string
) {
  return (self: Effect<R, E, A>) => sandboxWith_(self, f, __trace)
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (_: Effect<R, Cause<E>, A>) => Effect<R, Cause<E2>, A>,
  __trace?: string
) {
  return unsandbox(f(sandbox(self)), __trace)
}
