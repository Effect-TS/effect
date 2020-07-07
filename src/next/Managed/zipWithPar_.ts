import { parallel } from "../Effect/ExecutionStrategy"

import * as T from "./deps"
import { makeManagedReleaseMap } from "./makeManagedReleaseMap"
import { Managed } from "./managed"
import { mapM_ } from "./mapM_"
import { ReleaseMap } from "./releaseMap"

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const zipWithPar_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
): Managed<unknown, R & R2, E | E2, B> =>
  mapM_(makeManagedReleaseMap(parallel), (rm) =>
    T.provideSome_(
      T.zipWithPar_(self.effect, that.effect, ([_, a], [__, a2]) =>
        // We can safely discard the finalizers here because the resulting Managed's early
        // release will trigger the ReleaseMap, which would release both finalizers in
        // parallel.
        f(a, a2)
      ),
      (r: R & R2): [R & R2, ReleaseMap] => [r, rm]
    )
  )
