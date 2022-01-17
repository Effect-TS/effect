import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import * as Iter from "../../Iterable"
import type { Managed } from "../definition"
import { makeManagedPar } from "../ReleaseMap/makeManagedPar"
import * as T from "./_internal/effect-api"
import { mapEffect_ } from "./mapEffect"

/**
 * Reduces an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, A>`,
 * working in parallel.
 */
export function reduceAllPar_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  a: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __trace?: string
): Managed<R, E, A> {
  return mapEffect_(
    makeManagedPar,
    (parallelReleaseMap) =>
      locally_(
        currentReleaseMap.value,
        parallelReleaseMap
      )(
        T.reduceAllPar_(
          Iter.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
          T.map_(a.effect, (_) => _.get(1)),
          f
        )
      ),
    __trace
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
  __trace?: string
) {
  return (as: Iterable<Managed<R, E, A>>): Managed<R, E, A> =>
    reduceAllPar_(as, a, f, __trace)
}
