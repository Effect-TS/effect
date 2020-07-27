import { Managed } from "./managed"
import { zipWith_ } from "./zipWith_"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zip_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>
) => zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zip = <S2, R2, E2, A2, B>(that: Managed<S2, R2, E2, A2>) => <S, R, E, A>(
  self: Managed<S, R, E, A>
) => zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])
