import { flow } from "../Function"
import { traceF, traceFrom, traceWith } from "../Tracing"
import type { Effect } from "./effect"
import { foreachParN_ } from "./foreachParN_"

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 *
 * Note: effects are never interrupted when started, if a failure is detected
 * no new effects will start and the fiber will complete as soon as the running
 * effects complete
 */
export function foreachParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (as: Iterable<A>) => Effect<R, E, readonly B[]> {
  const trace = traceF(() => flow(traceWith("Effect/foreachParN"), traceFrom(f)))
  const g = trace(f)
  return (as) => foreachParN_(n)(as, g)
}
