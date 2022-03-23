import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { HasClock } from "../../../io/Clock"
import { Stream } from "../definition"

/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @tsplus fluent ets/Stream timeout
 */
export function timeout_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return Stream.succeed(duration).flatMap((duration) =>
    Stream.fromPull(
      self.toPull().map((pull) => pull.timeoutFail(Option.none, duration.milliseconds))
    )
  )
}

/**
 * Ends the stream if it does not produce a value after the specified duration.
 */
export const timeout = Pipeable(timeout_)
