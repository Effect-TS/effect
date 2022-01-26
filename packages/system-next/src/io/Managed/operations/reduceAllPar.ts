import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Reduces an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, A>`,
 * working in parallel.
 *
 * @ets static ets/ManagedOps reduceAllPar
 */
export function reduceAllPar_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  a: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Managed<R, E, A> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) =>
    locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(
      Effect.reduceAllPar(
        Iter.map_(as, (managed) => managed.effect.map((_) => _.get(1))),
        a.effect.map((_) => _.get(1)),
        f
      )
    )
  )
}

/**
 * Reduces an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, A>`,
 * working in parallel.
 *
 * @ets_data_first reduceAllPar_
 */
export function reduceAllPar<R, E, A>(
  a: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
) {
  return (as: Iterable<Managed<R, E, A>>): Managed<R, E, A> => reduceAllPar_(as, a, f)
}
