import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import { FiberRef } from "../../FiberRef"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * @tsplus static ets/ManagedOps forEachPar
 */
export function forEachPar<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, B>,
  __tsplusTrace?: string
): Managed<R, E, Chunk<B>> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) => {
    const makeInnerMap = ReleaseMap.makeManaged(ExecutionStrategy.Sequential)
      .effect.map((_) => _.get(1))
      .apply(FiberRef.currentReleaseMap.value.locally(parallelReleaseMap))
    return Effect.forEachPar(as, (a) =>
      makeInnerMap.flatMap((innerMap) =>
        f(a)
          .effect.map((_) => _.get(1))
          .apply(FiberRef.currentReleaseMap.value.locally(innerMap))
      )
    )
  })
}
