import { Managed } from "./managed"
import { zipWith_ } from "./zipWith_"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zipWith = <A, S2, R2, E2, A2, B>(
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => <S, R, E>(self: Managed<S, R, E, A>) => zipWith_(self, that, f)
