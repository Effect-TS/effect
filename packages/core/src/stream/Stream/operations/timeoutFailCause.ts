import { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { Cause } from "../../../io/Cause"
import type { HasClock } from "../../../io/Clock"
import { Stream } from "../definition"

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus fluent ets/Stream timeoutFailCause
 */
export function timeoutFailCause_<R, E, E2, A>(
  self: Stream<R, E, A>,
  cause: LazyArg<Cause<E2>>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E | E2, A> {
  return Stream.succeed(Tuple(cause(), duration())).flatMap(
    ({ tuple: [cause, duration] }) =>
      Stream.fromPull(
        self
          .toPull()
          .map((pull) =>
            pull.timeoutFailCause(cause.map(Option.some), duration.milliseconds)
          )
      )
  )
}

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 */
export const timeoutFailCause = Pipeable(timeoutFailCause_)
