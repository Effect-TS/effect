// ets_tracing: off

import { checkTraced, traced, untraced } from "./core.js"
import type { Effect } from "./effect.js"

function restore(
  b: boolean
): <R1, E1, A1>(self: Effect<R1, E1, A1>) => Effect<R1, E1, A1> {
  return (self) => (b ? traced(self) : untraced(self))
}

/**
 * Makes the effect untraced, but passes it a restore function that can be used to restore
 * the inherited traceability from whatever region the effect is composed into.
 */
export function untracedMask<R, E, A>(
  f: (
    restore: <R1, E1, A1>(self: Effect<R1, E1, A1>) => Effect<R1, E1, A1>
  ) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkTraced((b) => untraced(f(restore(b))))
}

/**
 * Makes the effect traced, but passes it a restore function that can be used to restore
 * the inherited traceability from whatever region the effect is composed into.
 */
export function tracedMask<R, E, A>(
  f: (
    restore: <R1, E1, A1>(self: Effect<R1, E1, A1>) => Effect<R1, E1, A1>
  ) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkTraced((b) => traced(f(restore(b))))
}
