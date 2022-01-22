import type { Cause } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"
import { zipRight_ } from "./zipRight"

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @ets fluent ets/Effect tapErrorCause
 */
export function tapErrorCause_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return foldCauseEffect_(
    self,
    (cause) => zipRight_(f(cause), failCause(cause)),
    succeedNow,
    __trace
  )
}

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @ets_data_first tapErrorCause_
 */
export function tapErrorCause<E, R2, E2, X>(
  f: (cause: Cause<E>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    tapErrorCause_(self, f, __trace)
}
