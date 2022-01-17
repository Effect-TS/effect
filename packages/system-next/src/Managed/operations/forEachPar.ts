import type * as C from "../../Collections/Immutable/Chunk"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { makeManaged } from "../ReleaseMap/makeManaged"
import { makeManagedPar } from "../ReleaseMap/makeManagedPar"
import * as T from "./_internal/effect-api"
import { mapEffect_ } from "./mapEffect"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach_`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, C.Chunk<B>> {
  return mapEffect_(makeManagedPar, (parallelReleaseMap) => {
    const makeInnerMap = locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(T.map_(makeManaged(T.sequential).effect, (_) => _.get(1)))

    return T.forEachPar_(as, (a) =>
      T.chain_(makeInnerMap, (innerMap) =>
        locally_(
          currentReleaseMap.value,
          innerMap
        )(T.map_(f(a).effect, (_) => _.get(1)))
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
  __trace?: string
) {
  return (as: Iterable<A>): Managed<R, E, C.Chunk<B>> => forEachPar_(as, f, __trace)
}
