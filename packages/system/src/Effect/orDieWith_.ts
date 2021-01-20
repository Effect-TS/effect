import { succeed } from "./core"
import { die } from "./die"
import type { Effect } from "./effect"
import { foldM_ } from "./foldM"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export function orDieWith_<R, E, A>(effect: Effect<R, E, A>, f: (e: E) => unknown) {
  return foldM_(effect, (e) => die(f(e)), succeed)
}
