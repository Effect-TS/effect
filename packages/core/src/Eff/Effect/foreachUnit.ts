import { foldMap } from "../Iterable"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { unit } from "./unit"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(as, f))`, but without the cost of building
 * the list of results.
 */
export const foreachUnit = <S, R, E, A>(
  f: (a: A) => Effect<S, R, E, any>
): ((as: Iterable<A>) => Effect<S, R, E, void>) =>
  foldMap<Effect<S, R, E, void>>({
    empty: unit,
    concat: (x, y) => chain_(x, () => y)
  })(f)
