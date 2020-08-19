import { failureOrCause } from "../Cause"
import * as E from "../Either"

import { chain_, foldCauseM_, halt, succeed } from "./core"
import { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const tapError_ = <S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  f: (e: E) => Effect<S2, R2, E2, any>
) =>
  foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    succeed
  )

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 */
export const tapError = <E, S2, R2, E2>(f: (e: E) => Effect<S2, R2, E2, any>) => <
  S,
  R,
  A
>(
  self: Effect<S, R, E, A>
) => tapError_(self, f)
