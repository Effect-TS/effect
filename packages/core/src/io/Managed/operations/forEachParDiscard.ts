import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { FiberRef } from "../../FiberRef"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreachDiscard`.
 *
 * @tsplus static ets/ManagedOps forEachParDiscard
 */
export function forEachParDiscard<R, E, A, X>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, X>,
  __tsplusTrace?: string
): Managed<R, E, void> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) => {
    const makeInnerMap = ReleaseMap.makeManaged(ExecutionStrategy.Sequential)
      .effect.map((_) => _.get(1))
      .apply(FiberRef.currentReleaseMap.value.locally(parallelReleaseMap))
    return Effect.forEachParDiscard(as, (a) =>
      makeInnerMap.flatMap((innerMap) =>
        f(a)
          .effect.map((_) => _.get(1))
          .apply(FiberRef.currentReleaseMap.value.locally(innerMap))
      )
    )
  })
}
