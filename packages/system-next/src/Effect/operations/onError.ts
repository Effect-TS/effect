import type { Cause } from "../../Cause"
import type { Effect, RIO } from "../definition"
import { onExit_ } from "./onExit"
import { unit } from "./unit"

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 */
export function onError_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<E>) => RIO<R2, X>,
  __trace?: string
): Effect<R & R2, E, A> {
  return onExit_(
    self,
    (exit): RIO<R2, X | void> => (exit._tag === "Success" ? unit : cleanup(exit.cause)),
    __trace
  )
}

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @ets_data_first onError_
 */
export function onError<E, R2, X>(
  cleanup: (cause: Cause<E>) => RIO<R2, X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E, A> =>
    onError_(self, cleanup, __trace)
}
