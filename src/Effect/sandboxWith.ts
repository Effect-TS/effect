import type { Cause } from "../Cause"
import type { Effect } from "./effect"
import { sandbox } from "./sandbox"
import { unsandbox } from "./unsandbox"

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith<S, R, E, A, E2>(
  f: (_: Effect<S, R, Cause<E>, A>) => Effect<S, R, Cause<E2>, A>
) {
  return (self: Effect<S, R, E, A>) => unsandbox(f(sandbox(self)))
}
