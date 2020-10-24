import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Sequentially zips this effect with the specified effect
 */
export function zip_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, readonly [A, A2]> {
  return chain_(a, (ra) => map_(b, (rb) => [ra, rb]))
}
