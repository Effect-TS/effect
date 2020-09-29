import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Parallely zips this effects
 */
export function zipPar<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, [A, A2]> =>
    zipWithPar_(a, b, (a, b) => [a, b])
}
