import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
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
  __etsTrace?: string
): Managed<R, E, Chunk<B>> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) => {
    const makeInnerMap = locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(ReleaseMap.makeManaged(sequential).effect.map((_) => _.get(1)))
    return Effect.forEachPar(as, (a) =>
      makeInnerMap.flatMap((innerMap) =>
        locally_(currentReleaseMap.value, innerMap)(f(a).effect.map((_) => _.get(1)))
      )
    )
  })
}
