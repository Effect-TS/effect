import type { Effect } from "./effect"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import { foreachExec_ } from "./foreachExec_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec(
  es: ExecutionStrategy
): <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (as: Iterable<A>) => Effect<R, E, readonly B[]> {
  return (f) => (as) => foreachExec_(es, as, f)
}
