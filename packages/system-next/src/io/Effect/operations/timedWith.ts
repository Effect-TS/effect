import type { Effect } from "../definition"
import { summarized_ } from "./summarized"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @ets fluent ets/Effect timedWith
 */
export function timedWith_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  msTime: Effect<R2, E2, number>,
  __etsTrace?: string
) {
  return summarized_(self, msTime, (start, end) => end - start, __etsTrace)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @ets_data_first timedWith_
 */
export function timedWith<R2, E2>(msTime: Effect<R2, E2, number>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => timedWith_(self, msTime, __etsTrace)
}
