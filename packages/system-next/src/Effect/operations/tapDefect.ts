// ets_tracing: off

import type { Cause } from "../../Cause"
import { stripFailures } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"
import { zipRight_ } from "./zipRight"

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 */
export function tapDefect_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return foldCauseEffect_(
    self,
    (cause) => zipRight_(f(stripFailures(cause)), failCause(cause)),
    succeedNow,
    __trace
  )
}

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @ets_data_first tapDefect_
 */
export function tapDefect<R2, E2, X>(
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapDefect_(self, f, __trace)
}
