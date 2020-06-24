import { tuple } from "../../Function"

import * as T from "./deps"
import { makeManagedReleaseMap } from "./makeManagedReleaseMap"
import { Managed } from "./managed"
import { mapM_ } from "./mapM_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
): Managed<unknown, R, E, readonly B[]> =>
  mapM_(makeManagedReleaseMap(T.parallelN(n)), (rm) =>
    T.provideSome_(
      T.foreachParN_(n)(as, (a) => T.map_(f(a).effect, ([_, b]) => b)),
      (r: R) => tuple(r, rm)
    )
  )
