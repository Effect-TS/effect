import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Reduces an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, A>`,
 * working in parallel.
 *
 * @tsplus static ets/ManagedOps reduceAllPar
 */
export function reduceAllPar_<R, E, A>(
  a: LazyArg<Managed<R, E, A>>,
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Managed<R, E, A> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) =>
    locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(
      Effect.reduceAllPar(
        a().effect.map((_) => _.get(1)),
        Iter.map_(as(), (managed) => managed.effect.map((_) => _.get(1))),
        f
      )
    )
  )
}
