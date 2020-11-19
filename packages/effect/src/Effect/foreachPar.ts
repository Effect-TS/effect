import type { Effect } from "./effect"
import { foreachPar_ } from "./foreachPar_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar<R, E, A, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): Effect<R, E, readonly B[]> => foreachPar_(as, f)
}
