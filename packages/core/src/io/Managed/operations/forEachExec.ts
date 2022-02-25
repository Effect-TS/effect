import type { LazyArg } from "../../../data/Function"
import type { ExecutionStrategy } from "../../ExecutionStrategy"
import { Managed } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @tsplus static ets/ManagedOps forEachExec
 */
export function forEachExec<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  executionStrategy: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __tsplusTrace?: string
) {
  return Managed.suspend(() => {
    switch (executionStrategy._tag) {
      case "Parallel": {
        return Managed.forEachPar(as, f).withParallelismUnbounded()
      }
      case "ParallelN": {
        return Managed.forEachPar(as, f).withParallelism(executionStrategy.n)
      }
      case "Sequential": {
        return Managed.forEach(as, f)
      }
    }
  })
}
