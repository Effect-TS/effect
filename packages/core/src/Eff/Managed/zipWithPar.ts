import { Managed } from "./managed"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const zipWithPar = <A, S2, R2, E2, A2, B>(
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => <S, R, E>(self: Managed<S, R, E, A>): Managed<unknown, R & R2, E | E2, B> =>
  zipWithPar_(self, that, f)
