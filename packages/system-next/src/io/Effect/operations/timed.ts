import { currentTime } from "../../Clock"
import type { Effect } from "../definition"
import { timedWith_ } from "./timedWith"

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @ets fluent ets/Effect timed
 */
export function timed<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return timedWith_(self, currentTime, __etsTrace)
}
