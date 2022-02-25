import type { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { Schedule } from "../../Schedule"
import type { Effect } from "../definition"

/**
 * Returns an effect that retries this effect with the specified schedule when
 * it fails, until the schedule is done, then both the value produced by the
 * schedule together with the last error are passed to the specified recovery
 * function.
 *
 * @tsplus fluent ets/Effect retryOrElseEither
 */
export function retryOrElseEither_<R, E, A, S, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2 & HasClock, E | E2, Either<A2, A>>
export function retryOrElseEither_<R, E, A, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2 & HasClock, E | E2, Either<A2, A>> {
  return Clock.retryOrElseEither(() => self, policy, orElse)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @ets_data_first retryOrElseEither_
 */
export function retryOrElseEither<S, R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): <R, A>(
  self: Effect<R, E, A>
) => Effect<R & R1 & R2 & HasClock, E | E2, Either<A2, A>>
export function retryOrElseEither<R1, E, A1, R2, E2, A2>(
  policy: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, A>(
    self: Effect<R, E, A>
  ): Effect<R & R1 & R2 & HasClock, E | E2, Either<A2, A>> =>
    self.retryOrElseEither(policy, orElse)
}
