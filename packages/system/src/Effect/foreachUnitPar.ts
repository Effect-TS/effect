import type { AsyncRE, Effect } from "./effect"
import { foreachUnitPar_ } from "./foreachUnitPar_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export const foreachUnitPar = <S, R, E, A>(f: (a: A) => Effect<S, R, E, any>) => (
  as: Iterable<A>
): AsyncRE<R, E, void> => foreachUnitPar_(as, f)
