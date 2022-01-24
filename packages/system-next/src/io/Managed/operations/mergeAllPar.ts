import * as Iter from "../../../collection/immutable/Iterable"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { makeManagedPar } from "../ReleaseMap/makeManagedPar"
import * as T from "./_internal/effect-api"
import { mapEffect_ } from "./mapEffect"

/**
 * Merges an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, B>`,
 * working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 *   - commutative: `f(a, b) == f(b, a)`
 *   - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 */
export function mergeAllPar_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
): Managed<R, E, B> {
  return mapEffect_(makeManagedPar, (parallelReleaseMap) =>
    locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(
      T.mergeAllPar_(
        Iter.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
        zero,
        f
      )
    )
  )
}

/**
 * Merges an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, B>`,
 * working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 *   - commutative: `f(a, b) == f(b, a)`
 *   - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * @ets_data_first mergeAllPar_
 */
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAllPar_(as, zero, f, __trace)
}
