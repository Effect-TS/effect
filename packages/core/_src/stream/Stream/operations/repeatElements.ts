/**
 * Repeats each element of the stream using the provided schedule. Repetitions
 * are done in addition to the first execution, which means using
 * `Schedule.recurs(1)` actually results in the original effect, plus an
 * additional recurrence, for a total of two repetitions of each value in the
 * stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeatElements
 * @tsplus pipeable effect/core/stream/Stream repeatElements
 */
export function repeatElements<S, R2, B>(
  schedule: LazyArg<Schedule<S, R2, unknown, B>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    self.repeatElementsEither(schedule).collectRight
}
