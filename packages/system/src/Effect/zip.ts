// tracing: off

import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @dataFirst zip_
 */
export function zip<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, readonly [A, A2]> =>
    zip_(a, b, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 */
export function zip_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, readonly [A, A2]> {
  return chain_(a, (ra) => map_(b, (rb) => [ra, rb]), __trace)
}
