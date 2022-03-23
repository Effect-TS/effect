import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { HasClock } from "../../../io/Clock"
import type { Schedule } from "../../../io/Schedule"
import type { Stream } from "../../Stream"

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @tsplus fluent ets/Stream schedule
 */
export function schedule_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, A, B>>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A>
export function schedule_<R, E, A, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<R2, A, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, A> {
  return self
    .scheduleEither(schedule)
    .collect((either) => (either.isRight() ? Option.some(either.right) : Option.none))
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export const schedule = Pipeable(schedule_)
