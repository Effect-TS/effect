import { chain_ } from "./chain_"
import { Managed } from "./managed"
import { map_ } from "./map_"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zipWith_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => chain_(self, (a) => map_(that, (a2) => f(a, a2)))
