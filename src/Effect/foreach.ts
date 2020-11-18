import { flow } from "../Function"
import { traceF, traceFrom, traceWith } from "../Tracing"
import type { Effect } from "./effect"
import { foreach_ } from "./foreach_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  const trace = traceF(() => flow(traceWith("Effect/foreach"), traceFrom(f)))
  return (as: Iterable<A>) => foreach_(as, trace(f))
}
