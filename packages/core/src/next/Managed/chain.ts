import { chain_ } from "./chain_"
import { Managed } from "./managed"

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain = <A, S2, R2, E2, A2>(f: (a: A) => Managed<S2, R2, E2, A2>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
) => chain_(self, f)
