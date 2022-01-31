// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { empty } from "../Cause/cause.js"
import { foldCauseM_, succeed } from "./core.js"
import type { Effect, RIO } from "./effect.js"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did not succeed.
 */
export function cause<R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
): RIO<R, Cause<E>> {
  return foldCauseM_(effect, succeed, () => succeed(empty), __trace)
}
