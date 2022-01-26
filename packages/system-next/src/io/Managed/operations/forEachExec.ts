import type { ExecutionStrategy } from "../../Effect/operations/ExecutionStrategy"
import { Managed } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets static ets/ManagedOps forEachExec
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  executionStrategy: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
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

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachExec_
 */
export function forEachExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>) => forEachExec_(as, es, f)
}
