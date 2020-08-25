import type { Effect } from "."
import { orElse_ } from "./orElse_"

/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 */
export function eventually<S, R, E, A>(fa: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return orElse_(fa, () => eventually(fa))
}
