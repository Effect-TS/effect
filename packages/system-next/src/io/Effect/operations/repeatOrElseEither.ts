import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import type { Effect } from "../definition"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus fluent ets/Effect repeatOrElseEither
 */
export function repeatOrElseEither_<S, R, E, A, R1, B, R2, E2, C>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __etsTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<C, B>>
export function repeatOrElseEither_<R, E, A, R1, B, R2, E2, C>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __etsTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<C, B>> {
  return Clock.repeatOrElseEither(self, schedule, orElse)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @ets_data_first repeateOrElseEither_
 */
export function repeatOrElseEither<S, R1, A, B, E, R2, E2, C>(
  schedule: LazyArg<Schedule.WithState<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __etsTrace?: string
): <R>(self: Effect<R, E, A>) => Effect<HasClock & R & R1 & R2, E2, Either<C, B>>
export function repeatOrElseEither<R1, A, B, E, R2, E2, C>(
  schedule: LazyArg<Schedule<R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, C>,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<HasClock & R & R1 & R2, E2, Either<C, B>> =>
    self.repeatOrElseEither(schedule, orElse)
}
