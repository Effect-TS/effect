import type { Duration } from "../../../data/Duration"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Effect } from "../definition"

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @tsplus fluent ets/Effect delay
 */
export function delay_<R, E, A>(
  self: Effect<R, E, A>,
  duration: Duration,
  __tsplusTrace?: string
): Effect<R & HasClock, E, A> {
  return Clock.sleep(duration) > self
}

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @ets_data_first delay_
 */
export function delay(duration: Duration, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasClock, E, A> =>
    self.delay(duration)
}
