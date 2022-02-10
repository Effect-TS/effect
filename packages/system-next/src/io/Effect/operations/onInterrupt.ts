import type { LazyArg } from "../../../data/Function"
import type { Effect, RIO } from "../definition"

/**
 * Runs the specified effect if this effect is interrupted.
 *
 * @tsplus fluent ets/Effect onInterrupt
 */
export function onInterrupt_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  cleanup: LazyArg<RIO<R1, X>>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return self.onInterruptWith(cleanup)
}

/**
 * Runs the specified effect if this effect is interrupted.
 *
 * @ets_data_first onInterrupt_
 */
export function onInterrupt<R1, X>(cleanup: LazyArg<RIO<R1, X>>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    self.onInterrupt(cleanup)
}
