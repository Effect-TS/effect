import * as E from "../../Either"
import { failureOrCause } from "../Cause"

import { chain_, foldCauseM_, halt } from "./core"
import { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth_ = <S, R, E, A, S2, R2, E2, S3, R3, E3>(
  self: Effect<S, R, E, A>,
  f: (e: E) => Effect<S2, R2, E2, any>,
  g: (a: A) => Effect<S3, R3, E3, any>
) =>
  foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    g
  )
