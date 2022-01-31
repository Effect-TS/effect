import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
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
  __etsTrace?: string
): Managed<R, E, void> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) => {
    const makeInnerMap = locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(ReleaseMap.makeManaged(sequential).effect.map((_) => _.get(1)))
    return Effect.forEachParDiscard(as, (a) =>
      makeInnerMap.flatMap((innerMap) =>
        locally_(currentReleaseMap.value, innerMap)(f(a).effect.map((_) => _.get(1)))
      )
    )
  })
}
