import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect forever (until the first error).
 */
export function forever<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
  return chain_(effect, () => forever(effect))
}
