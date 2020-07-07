import { foreachPar_ } from "./foreachPar_"
import { Managed } from "./managed"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar = <S, R, E, A, B>(f: (a: A) => Managed<S, R, E, B>) => (
  as: Iterable<A>
): Managed<unknown, R, E, readonly B[]> => foreachPar_(as, f)
