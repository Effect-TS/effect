import type { Effect } from "./effect"
import { zipPar_ } from "./zipPar_"

/**
 * Parallely zips this effects
 */
export function zipPar<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, [A, A2]> => zipPar_(a, b)
}
