import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import { Managed } from "../definition"

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus fluent ets/Managed retry
 */
export function retry_<R, E, A, S, R1, X>(
  self: Managed<R, E, A>,
  policy: LazyArg<Schedule.WithState<S, R1, E, X>>,
  __tsplusTrace?: string
): Managed<R & R1 & HasClock, E, A>
export function retry_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  policy: LazyArg<Schedule<R1, E, X>>,
  __tsplusTrace?: string
): Managed<R & R1 & HasClock, E, A> {
  return Managed(self.effect.retry(policy))
}

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @ets_data_first retry_
 */
export function retry<S, R1, E, X>(
  policy: LazyArg<Schedule.WithState<S, R1, E, X>>,
  __tsplusTrace?: string
): <R, A>(self: Managed<R, E, A>) => Managed<R & R1 & HasClock, E, A>
export function retry<R1, E, X>(
  policy: LazyArg<Schedule<R1, E, X>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1 & HasClock, E, A> =>
    self.retry(policy)
}
