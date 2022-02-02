import type { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar_`.
 * If you do not need the results, see `forEachUnit_` for a more efficient implementation.
 *
 * @tsplus static ets/ManagedOps forEach
 */
export function forEach<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
): Managed<R, E, Chunk<B>> {
  return Managed(
    Effect.forEach(as, (a) => f(a).effect).map((res) => {
      const fins = res.map((k) => k.get(0))
      const as = res.map((k) => k.get(1))
      return Tuple((e) => Effect.forEach(fins.reverse(), (fin) => fin(e)), as)
    })
  )
}
