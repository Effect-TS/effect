import type { Effect } from "./effect"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Parallely zips this effects
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, [A, A2]> {
  return zipWithPar_(a, b, (a, b) => [a, b])
}
