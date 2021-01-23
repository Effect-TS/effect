import type { Cause } from "../Cause"
import type { Effect } from "./effect"
import { sandbox } from "./sandbox"
import { unsandbox } from "./unsandbox"

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith<R, E, A, E2>(
  f: (_: Effect<R, Cause<E>, A>) => Effect<R, Cause<E2>, A>
) {
  return (self: Effect<R, E, A>) => unsandbox(f(sandbox(self)))
}
