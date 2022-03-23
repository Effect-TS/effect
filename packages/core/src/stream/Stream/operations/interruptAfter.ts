import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../../Stream"

/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 *
 * @tsplus fluent ets/Stream interruptAfter
 */
export function interruptAfter_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return self.interruptWhen(Effect.sleep(duration().milliseconds))
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 */
export const interruptAfter = Pipeable(interruptAfter_)
