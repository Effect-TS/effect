// ets_tracing: off

import { failureOrCause } from "../Cause"
import * as E from "../Either"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  __trace?: string
) {
  return foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    succeed,
    __trace
  )
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => tapError_(self, f, __trace)
}
