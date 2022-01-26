import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../../Effect"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Merges an `Iterable<Managed<R, E, A>>` to a single `Managed<R, E, B>`,
 * working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 *   - commutative: `f(a, b) == f(b, a)`
 *   - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * @ets static ets/ManagedOps mergeAllPar
 */
export function mergeAllPar_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __etsTrace?: string
): Managed<R, E, B> {
  return ReleaseMap.makeManagedPar.mapEffect((parallelReleaseMap) =>
    locally_(
      currentReleaseMap.value,
      parallelReleaseMap
    )(
      Effect.mergeAllPar(
        Iter.map_(as, (managed) => managed.effect.map((_) => _.get(1))),
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
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B, __etsTrace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAllPar_(as, zero, f)
}
