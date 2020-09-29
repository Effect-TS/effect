import type { Effect } from "./effect"
import { orDieWith } from "./orDieWith"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export function orDie<R, E, A>(effect: Effect<R, E, A>) {
  return orDieWith((e: E) => e)(effect)
}
