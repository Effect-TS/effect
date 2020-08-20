import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export const zipWith = <A, S2, R2, E2, A2, B>(
  b: Effect<S2, R2, E2, A2>,
  f: (a: A, b: A2) => B
) => <S, R, E>(a: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, B> =>
  chain_(a, (ra) => map_(b, (rb) => f(ra, rb)))
