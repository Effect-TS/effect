import type * as C from "../../../collection/immutable/Chunk/core"
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
 * @ets static ets/ManagedOps forEachPar
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
): Managed<R, E, C.Chunk<B>> {
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

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Managed<R, E, C.Chunk<B>> => forEachPar_(as, f)
}
