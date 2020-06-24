import { foreach_ } from "./foreach_"
import { Managed } from "./managed"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export const foreach = <S, R, E, A, B>(f: (a: A) => Managed<S, R, E, B>) => (
  as: Iterable<A>
) => foreach_(as, f)
