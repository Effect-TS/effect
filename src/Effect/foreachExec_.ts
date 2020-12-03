import type { Effect } from "./effect"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import { foreach_, foreachPar_ } from "./foreach"
import { foreachParN_ } from "./foreachParN_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec_<R, E, A, B>(
  es: ExecutionStrategy,
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, readonly B[]> {
  switch (es._tag) {
    case "Sequential": {
      return foreach_(as, f) as any
    }
    case "Parallel": {
      return foreachPar_(as, f) as any
    }
    case "ParallelN": {
      return foreachParN_(es.n)(as, f) as any
    }
  }
}
