import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Stream } from "../definition"

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus fluent ets/Stream timeoutFail
 */
export function timeoutFail_<R, E, E2, A>(
  self: Stream<R, E, A>,
  e: LazyArg<E2>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E | E2, A> {
  return self.timeoutTo(duration, Stream.fail(e))
}

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 */
export const timeoutFail = Pipeable(timeoutFail_)
