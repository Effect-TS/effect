import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Schedule } from "../../../io/Schedule"
import type { Stream } from "../definition"

/**
 * Emits elements of this stream with a fixed delay in between, regardless of
 * how long it takes to produce a value.
 *
 * @tsplus fluent ets/Stream fixed
 */
export function fixed_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return self.schedule(Schedule.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of
 * how long it takes to produce a value.
 */
export const fixed = Pipeable(fixed_)
