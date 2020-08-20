import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export const zipWithPar = <A, S2, R2, E2, A2, B>(
  b: Effect<S2, R2, E2, A2>,
  f: (a: A, b: A2) => B
) => <S, R, E>(a: Effect<S, R, E, A>): Effect<unknown, R & R2, E | E2, B> =>
  zipWithPar_(a, b, f)
