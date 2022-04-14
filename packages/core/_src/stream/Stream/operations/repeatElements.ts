/**
 * Repeats each element of the stream using the provided schedule. Repetitions
 * are done in addition to the first execution, which means using
 * `Schedule.recurs(1)` actually results in the original effect, plus an
 * additional recurrence, for a total of two repetitions of each value in the
 * stream.
 *
 * @tsplus fluent ets/Stream repeatElements
 */
export function repeatElements_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<S, R2, unknown, B>>,
  __tsplusTrace?: string
): Stream<R & R2, E, A> {
  return self.repeatElementsEither(schedule).collectRight();
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions
 * are done in addition to the first execution, which means using
 * `Schedule.recurs(1)` actually results in the original effect, plus an
 * additional recurrence, for a total of two repetitions of each value in the
 * stream.
 *
 * @tsplus static ets/Stream/Aspects repeatElements
 */
export const repeatElements = Pipeable(repeatElements_);
