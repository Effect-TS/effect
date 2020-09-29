import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Sequentially zips this effect with the specified effect,
 * ignoring result of the first
 */
export function zipSecond_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A2> {
  return chain_(a, (_) => b)
}
