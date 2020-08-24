import type { Cause } from "../Cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<S, R, E, A>(fa: Effect<S, R, E, A>): Effect<S, R, Cause<E>, A> {
  return foldCauseM_(fa, fail, succeed)
}
