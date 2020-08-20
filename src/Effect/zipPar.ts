import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Parallely zips this effects
 */
export const zipPar = <S2, R2, E2, A2>(b: Effect<S2, R2, E2, A2>) => <S, R, E, A>(
  a: Effect<S, R, E, A>
): Effect<unknown, R & R2, E | E2, [A, A2]> => zipWithPar_(a, b, (a, b) => [a, b])
