import { unzip } from "../../../collection/immutable/Chunk/api/unzip"
import * as C from "../../../collection/immutable/Chunk/core"
import * as Tp from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect-api"

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects sequentially.
 *
 * Equivalent to `forEach(as)(f).unit`, but without the cost of building
 * the list of results.
 */
export function forEachDiscard_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, void> {
  return managedApply(
    T.map_(
      T.forEach_(as, (a) => f(a).effect, __trace),
      (result) => {
        const {
          tuple: [fins]
        } = unzip(result)
        return Tp.tuple<[Finalizer, void]>(
          (e) => T.forEach_(C.reverse(fins), (f) => f(e), __trace),
          undefined
        )
      }
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects sequentially.
 *
 * Equivalent to `forEach(as)(f).unit`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachDiscard_
 */
export function forEachDiscard<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachDiscard_(as, f, __trace)
}
