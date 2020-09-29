import { succeed } from "./core"
import type { Effect } from "./effect"
import { foldM_ } from "./foldM_"

/**
 * Recovers from all errors.
 */
export function catchAll<R, E, E2, A>(f: (e: E2) => Effect<R, E, A>) {
  return <R2, A2>(effect: Effect<R2, E2, A2>) => foldM_(effect, f, (x) => succeed(x))
}
