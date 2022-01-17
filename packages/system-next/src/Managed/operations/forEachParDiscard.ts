import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { makeManaged } from "../ReleaseMap/makeManaged"
import { makeManagedPar } from "../ReleaseMap/makeManagedPar"
import * as T from "./_internal/effect-api"
import { mapEffect_ } from "./mapEffect"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreachDiscard`.
 */
export function forEachParDiscard_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, X>,
  __trace?: string
): Managed<R, E, void> {
  return mapEffect_(makeManagedPar, (parallelReleaseMap) => {
    const makeInnerMap = locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(T.map_(makeManaged(T.sequential).effect, (_) => _.get(1)))

    return T.forEachParDiscard_(
      as,
      (a) =>
        T.chain_(makeInnerMap, (innerMap) =>
          locally_(
            currentReleaseMap.value,
            innerMap
          )(T.map_(f(a).effect, (_) => _.get(1)))
        ),
      __trace
    )
  })
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreachDiscard`.
 *
 * @ets_data_first forEachParDiscard_
 */
export function forEachParDiscard<A, R, E, X>(
  f: (a: A) => Managed<R, E, X>,
  __trace?: string
) {
  return (as: Iterable<A>): Managed<R, E, void> => forEachParDiscard_(as, f, __trace)
}
