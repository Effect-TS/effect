import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import type { Effect } from "../definition"

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @tsplus fluent ets/Effect retryOrElse
 */
export function retryOrElse_<R, E, A, S, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R1 & R2 & HasClock, E | E2, A1 | A2>
export function retryOrElse_<R, E, A, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R1 & R2 & HasClock, E | E2, A | A2> {
  return Clock.retryOrElse(() => self, policy, orElse)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @ets_data_first retryOrElse_
 */
export function retryOrElse<S, R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __etsTrace?: string
): <R, A>(self: Effect<R, E, A>) => Effect<R & R1 & R2 & HasClock, E | E2, A1 | A2>
export function retryOrElse<R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1 & R2 & HasClock, E | E2, A1 | A2> => self.retryOrElse(policy, orElse)
}
