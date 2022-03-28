import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import type { HasClock } from "../../Clock"
import { Effect } from "../definition"

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @tsplus fluent ets/Effect timeoutFailCause
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: Effect<R, E, A>,
  cause: LazyArg<Cause<E1>>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<R & HasClock, E | E1, A> {
  return self.timeoutTo(Effect.failCause(cause), Effect.succeedNow, duration).flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 */
export const timeoutFailCause = Pipeable(timeoutFailCause_)
