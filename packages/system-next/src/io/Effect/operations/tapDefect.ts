import type { Cause } from "../../Cause"
import { stripFailures } from "../../Cause"
import { Effect } from "../definition"

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @tsplus fluent ets/Effect tapDefect
 */
export function tapDefect_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) => f(stripFailures(cause)).zipRight(Effect.failCauseNow(cause)),
    Effect.succeedNow
  )
}

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @ets_data_first tapDefect_
 */
export function tapDefect<R2, E2, X>(
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapDefect_(self, f)
}
