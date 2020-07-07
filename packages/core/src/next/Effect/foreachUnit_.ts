import { Effect } from "./effect"
import { foreachUnit } from "./foreachUnit"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 */
export const foreachUnit_ = <S, R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<S, R, E, any>
): Effect<S, R, E, void> => foreachUnit(f)(as)
