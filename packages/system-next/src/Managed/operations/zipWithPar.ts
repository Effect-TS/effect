// ets_tracing: off

import { currentReleaseMap } from "../../FiberRef/definition/concrete"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { makeManaged } from "../ReleaseMap/makeManaged"
import * as T from "./_internal/effect"
import { mapEffect_ } from "./mapEffect"

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * either side fails, then the other side will be interrupted.
 */
export function zipWithPar_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __trace?: string
): Managed<R & R2, E | E2, B> {
  return mapEffect_(
    makeManaged(T.sequential),
    (parallelReleaseMap) => {
      const innerMap = locally_(
        currentReleaseMap.value,
        parallelReleaseMap,
        makeManaged(T.sequential).effect
      )

      return T.chain_(
        T.zip_(innerMap, innerMap),
        ({
          tuple: [
            {
              tuple: [, l]
            },
            {
              tuple: [, r]
            }
          ]
        }) => {
          const left = locally_(currentReleaseMap.value, l, self.effect)
          const right = locally_(currentReleaseMap.value, r, that.effect)
          // We can safely discard the finalizers here because the resulting ZManaged's early
          // release will trigger the ReleaseMap, which would release both finalizers in
          // parallel.
          return T.zipWithPar_(left, right, ({ tuple: [, a] }, { tuple: [, b] }) =>
            f(a, b)
          )
        }
      )
    },
    __trace
  )
}

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * either side fails, then the other side will be interrupted.
 *
 * @ets_data_first zipWithPar_
 */
export function zipWithPar<R2, E2, A, A2, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, B> =>
    zipWithPar_(self, that, f, __trace)
}
