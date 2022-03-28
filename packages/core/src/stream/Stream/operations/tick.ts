import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import { constVoid } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Schedule } from "../../../io/Schedule"
import { Stream } from "../definition"

/**
 * Returns a stream that emits `undefined` values spaced by the specified
 * duration.
 *
 * @tsplus static ets/StreamOps tick
 */
export function tick(
  interval: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<HasClock, never, void> {
  return Stream.repeatWithSchedule(constVoid, Schedule.spaced(interval))
}
