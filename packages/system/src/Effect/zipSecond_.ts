import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Sequentially zips this effect with the specified effect,
 * ignoring result of the first
 */
export const zipSecond_ = <S, R, E, A, S2, R2, E2, A2>(
  a: Effect<S, R, E, A>,
  b: Effect<S2, R2, E2, A2>
): Effect<S | S2, R & R2, E | E2, A2> => chain_(a, (_) => b)
