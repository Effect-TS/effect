// ets_tracing: off

import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in sequence, combining their results with the specified `f` function.
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __trace?: string
): Managed<R & R2, E | E2, B> {
  return chain_(self, (a) => map_(that, (a2) => f(a, a2)), __trace)
}

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in sequence, combining their results with the specified `f` function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<R2, E2, A2, A, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, B> =>
    zipWith_(self, that, f, __trace)
}
