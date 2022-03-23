import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import type { Schedule } from "../../../io/Schedule"
import type { Stream } from "../definition"

/**
 * Repeats each element of the stream using the provided schedule. When the
 * schedule is finished, then the output of the schedule will be emitted into
 * the stream. Repetitions are done in addition to the first execution, which
 * means using `Schedule.recurs(1)` actually results in the original effect,
 * plus an additional recurrence, for a total of two repetitions of each value
 * in the stream.
 *
 * @tsplus fluent ets/Stream repeatElementsEither
 */
export function repeatElementsEither_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, unknown, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, Either<B, A>>
export function repeatElementsEither_<R, E, A, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<R2, unknown, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, Either<B, A>> {
  return self.repeatElementsWith(
    schedule,
    (a) => Either.rightW(a),
    (b) => Either.leftW(b)
  )
}

/**
 * Repeats each element of the stream using the provided schedule. When the
 * schedule is finished, then the output of the schedule will be emitted into
 * the stream. Repetitions are done in addition to the first execution, which
 * means using `Schedule.recurs(1)` actually results in the original effect,
 * plus an additional recurrence, for a total of two repetitions of each value
 * in the stream.
 */
export const repeatElementsEither = Pipeable(repeatElementsEither_)
