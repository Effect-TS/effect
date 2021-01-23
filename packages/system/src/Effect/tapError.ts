import { failureOrCause } from "../Cause"
import * as E from "../Either"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export function tapError_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, any>
) {
  return foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    succeed
  )
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export function tapError<E, R2, E2>(f: (e: E) => Effect<R2, E2, any>) {
  return <R, A>(self: Effect<R, E, A>) => tapError_(self, f)
}
