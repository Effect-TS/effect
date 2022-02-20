import { currentTime } from "../../Clock"
import type { Effect } from "../definition"

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @tsplus fluent ets/Effect timed
 */
export function timed<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return self.timedWith(currentTime)
}
