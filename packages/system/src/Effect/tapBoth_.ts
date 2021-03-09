import { failureOrCause } from "../Cause"
import * as E from "../Either"
import { chain_, foldCauseM_, halt } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth_<R, E, A, R2, E2, R3, E3, X, Y>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, Y>
) {
  return foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    g
  )
}
