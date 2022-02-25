import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import { Effect } from "../definition"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @tsplus fluent ets/Effect repeat
 */
export function repeat_<S, R, E, A, R1, B>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R1, A, B>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, B>
export function repeat_<R, E, A, R1, B>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<R1, A, B>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, B> {
  return self.repeatOrElse(schedule, (e, _) => Effect.fail(e))
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @ets_data_first repeat_
 */
export function repeat<S, R1, A, B>(
  schedule: LazyArg<Schedule.WithState<S, R1, A, B>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<HasClock & R & R1, E, B>
export function repeat<R1, A, B>(
  schedule: LazyArg<Schedule<R1, A, B>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<HasClock & R & R1, E, B> =>
    self.repeat(schedule)
}
