// ets_tracing: off

import type { Managed } from "../definition"
import type { ExecutionStrategy } from "./_internal/effect"
import { forEach_ } from "./forEach"
import { forEachPar_ } from "./forEachPar"
import { suspend } from "./suspend"
import { withParallelism_ } from "./withParallelism"
import { withParallelismUnbounded } from "./withParallelismUnbounded"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return suspend(() => {
    switch (es._tag) {
      case "Parallel": {
        return withParallelismUnbounded(forEachPar_(as, f))
      }
      case "ParallelN": {
        return withParallelism_(forEachPar_(as, f), es.n)
      }
      case "Sequential": {
        return forEach_(as, f)
      }
    }
  }, __trace)
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
  __trace?: string
) {
  return (as: Iterable<A>) => forEachExec_(as, es, f, __trace)
}
