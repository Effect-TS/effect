import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Schedule } from "../../../io/Schedule"
import { Stream } from "../definition"

/**
 * Repeats the value using the provided schedule.
 *
 * @tsplus static ets/StreamOps repeatWithSchedule
 */
export function repeatWithSchedule<S, R, A>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule.WithState<S, R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R & HasClock, never, A>
export function repeatWithSchedule<R, A>(
  a: LazyArg<A>,
  schedule: LazyArg<Schedule<R, A, unknown>>,
  __tsplusTrace?: string
): Stream<R & HasClock, never, A> {
  return Stream.repeatEffectWithSchedule(Effect.succeed(a), schedule)
}
