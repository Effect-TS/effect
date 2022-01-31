import { unzip } from "../../../collection/immutable/Chunk/api/unzip"
import * as C from "../../../collection/immutable/Chunk/core"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects sequentially.
 *
 * Equivalent to `forEach(as)(f).unit`, but without the cost of building
 * the list of results.
 *
 * @tsplus static ets/ManagedOps forEachDiscard
 */
export function forEachDiscard<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Managed<R, E, B>,
  __etsTrace?: string
): Managed<R, E, void> {
  return Managed(
    Effect.forEach(as, (a) => f(a).effect).map((result) => {
      const {
        tuple: [fins]
      } = unzip(result)
      return Tuple<[Finalizer, void]>(
        (e) => Effect.forEach(C.reverse(fins), (f) => f(e)),
        undefined
      )
    })
  )
}
