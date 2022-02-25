import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import type { Effect } from "../definition"

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus fluent ets/Effect retry
 */
export function retry_<R, E, A, S, R1, B>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule.WithState<S, R1, E, B>>,
  __tsplusTrace?: string
): Effect<R & R1 & HasClock, E, A>
export function retry_<R, E, A, R1, B>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule<R1, E, B>>,
  __tsplusTrace?: string
): Effect<R & R1 & HasClock, E, A> {
  return Clock.retry(() => self, policy)
}

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @ets_data_first retry_
 */
export function retry<S, R1, E, B>(
  policy: LazyArg<Schedule.WithState<S, R1, E, B>>,
  __tsplusTrace?: string
): <R, A>(self: Effect<R, E, A>) => Effect<R & R1 & HasClock, E, A>
export function retry<R1, E, B>(
  policy: LazyArg<Schedule<R1, E, B>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1 & HasClock, E, A> =>
    self.retry(policy)
}
