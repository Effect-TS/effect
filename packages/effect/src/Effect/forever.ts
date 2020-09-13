import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect forever (until the first error).
 */
export function forever<S, R, E, A>(effect: Effect<S, R, E, A>): Effect<S, R, E, A> {
  return chain_(effect, () => forever(effect))
}
