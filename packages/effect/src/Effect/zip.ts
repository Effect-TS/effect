import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Sequentially zips this effect with the specified effect
 */
export function zip<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, [A, A2]> =>
    chain_(a, (ra) => map_(b, (rb) => [ra, rb]))
}
