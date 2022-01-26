import * as C from "../../../collection/immutable/Chunk/core"
import * as Tp from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar_`.
 * If you do not need the results, see `forEachUnit_` for a more efficient implementation.
 *
 * @ets static ets/ManagedOps forEach
 */
export function forEach_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
): Managed<R, E, C.Chunk<B>> {
  return Managed(
    Effect.forEach(as, (a) => f(a).effect).map((res) => {
      const fins = C.map_(res, (k) => k.get(0))
      const as = C.map_(res, (k) => k.get(1))
      return Tp.tuple((e) => Effect.forEach(C.reverse(fins), (fin) => fin(e)), as)
    })
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
) {
  return (as: Iterable<A>) => forEach_(as, f)
}
