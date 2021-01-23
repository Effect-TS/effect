import type { Cause } from "../Cause/cause"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 */
export function tapCause_<R2, A2, R, E, E2>(
  effect: Effect<R2, E2, A2>,
  f: (e: Cause<E2>) => Effect<R, E, any>
) {
  return foldCauseM_(effect, (c) => chain_(f(c), () => halt(c)), succeed)
}
