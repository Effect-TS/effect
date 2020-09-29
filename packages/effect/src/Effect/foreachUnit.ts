import { foldMap } from "../Iterable"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(as, f))`, but without the cost of building
 * the list of results.
 */
export function foreachUnit<R, E, A>(
  f: (a: A) => Effect<R, E, any>
): (as: Iterable<A>) => Effect<R, E, void> {
  return foldMap<Effect<R, E, void>>({
    empty: unit,
    concat: (x, y) => chain_(x, () => y)
  })(f)
}
