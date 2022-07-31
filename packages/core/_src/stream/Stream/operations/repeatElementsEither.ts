/**
 * Repeats each element of the stream using the provided schedule. When the
 * schedule is finished, then the output of the schedule will be emitted into
 * the stream. Repetitions are done in addition to the first execution, which
 * means using `Schedule.recurs(1)` actually results in the original effect,
 * plus an additional recurrence, for a total of two repetitions of each value
 * in the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeatElementsEither
 * @tsplus pipeable effect/core/stream/Stream repeatElementsEither
 */
export function repeatElementsEither<S, R2, B>(
  schedule: LazyArg<Schedule<S, R2, unknown, B>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E, Either<B, A>> =>
    self.repeatElementsWith(
      schedule,
      (a) => Either.rightW(a),
      (b) => Either.leftW(b)
    )
}
