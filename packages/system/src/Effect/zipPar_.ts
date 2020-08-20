import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Parallely zips this effects
 */
export const zipPar_ = <S, R, E, A, S2, R2, E2, A2>(
  a: Effect<S, R, E, A>,
  b: Effect<S2, R2, E2, A2>
): Effect<unknown, R & R2, E | E2, [A, A2]> => zipWithPar_(a, b, (a, b) => [a, b])
