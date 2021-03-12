import type { Cause } from "../Cause/cause"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @dataFirst tapCause_
 */
export function tapCause<R, E, E2, X>(
  f: (e: Cause<E2>) => Effect<R, E, X>,
  __trace?: string
) {
  return <R2, A2>(effect: Effect<R2, E2, A2>) => tapCause_(effect, f, __trace)
}

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 */
export function tapCause_<R2, A2, R, E, E2, X>(
  effect: Effect<R2, E2, A2>,
  f: (e: Cause<E2>) => Effect<R, E, X>,
  __trace?: string
) {
  return foldCauseM_(effect, (c) => chain_(f(c), () => halt(c)), succeed, __trace)
}
