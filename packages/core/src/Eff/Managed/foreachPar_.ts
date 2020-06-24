import { tuple } from "../../Function"

import * as T from "./deps"
import { makeManagedReleaseMap } from "./makeManagedReleaseMap"
import { Managed } from "./managed"
import { mapM_ } from "./mapM_"

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const foreachPar_ = <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
): Managed<unknown, R, E, readonly B[]> =>
  mapM_(makeManagedReleaseMap(T.parallel), (rm) =>
    T.provideSome_(
      T.foreachPar_(as, (a) => T.map_(f(a).effect, ([_, b]) => b)),
      (r: R) => tuple(r, rm)
    )
  )
