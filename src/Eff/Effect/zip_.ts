import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Sequentially zips this effect with the specified effect
 */
export const zip_ = <S, R, E, A, S2, R2, E2, A2>(
  a: Effect<S, R, E, A>,
  b: Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E | E2, [A, A2]> =>
  chain_(a, (ra) => map_(b, (rb) => [ra, rb]))
