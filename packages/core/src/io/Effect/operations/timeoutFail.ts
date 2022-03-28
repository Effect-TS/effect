import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Effect } from "../definition"

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @tsplus fluent ets/Effect timeoutFail
 */
export function timeoutFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<R & HasClock, E | E1, A> {
  return self.timeoutTo(Effect.fail(e), Effect.succeedNow, duration).flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 */
export const timeoutFail = Pipeable(timeoutFail_)
