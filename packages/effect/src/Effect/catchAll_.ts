import { succeed } from "./core"
import type { Effect } from "./effect"
import { foldM_ } from "./foldM_"

/**
 * Recovers from all errors.
 */
export function catchAll_<R2, E2, A2, R, E, A>(
  effect: Effect<R2, E2, A2>,
  f: (e: E2) => Effect<R, E, A>
) {
  return foldM_(effect, f, (x) => succeed(x))
}
