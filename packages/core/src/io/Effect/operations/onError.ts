import type { Cause } from "../../Cause"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @tsplus fluent ets/Effect onError
 */
export function onError_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<E>) => RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E, A> {
  return self.onExit(
    (exit): RIO<R2, X | void> =>
      exit._tag === "Success" ? Effect.unit : cleanup(exit.cause)
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
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E, A> => self.onError(cleanup)
}
