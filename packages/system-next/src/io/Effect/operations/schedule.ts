import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import type { Effect } from "../definition"

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus fluent ets/Effect schedule
 */
export function schedule_<R, E, A, S, R1, A1>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R1, any, A1>>,
  __etsTrace?: string
): Effect<R & R1 & HasClock, E, A1>
export function schedule_<R, E, A, R1, A1>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<R1, any, A1>>,
  __etsTrace?: string
): Effect<R & R1 & HasClock, E, A1> {
  return Clock.schedule(() => self, schedule)
}

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @ets_data_first schedule_
 */
export function schedule<S, R1, A1>(
  schedule: LazyArg<Schedule.WithState<S, R1, any, A1>>,
  __etsTrace?: string
): <R, E, A>(self: Effect<R, E, A>) => Effect<R & R1 & HasClock, E, A1>
export function schedule<R1, A1>(
  schedule: LazyArg<Schedule<R1, any, A1>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1 & HasClock, E, A1> =>
    self.schedule(schedule)
}
