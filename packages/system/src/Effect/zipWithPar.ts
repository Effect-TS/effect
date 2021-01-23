import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function zipWithPar<A, R2, E2, A2, B>(
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) {
  return <R, E>(a: Effect<R, E, A>): Effect<R & R2, E | E2, B> => zipWithPar_(a, b, f)
}
