// tracing: off

import type { Cause } from "../Cause"
import type { Effect } from "./effect"
import { sandbox } from "./sandbox"
import { unsandbox } from "./unsandbox"

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @dataFirst sandboxWith_
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
