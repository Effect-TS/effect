/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects schedule
 * @tsplus pipeable effect/core/stream/Stream schedule
 */
export function schedule<S, R2, A, B>(
  schedule: LazyArg<Schedule<S, R2, A, B>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    self
      .scheduleEither(schedule)
      .collect((either) => (either.isRight() ? Maybe.some(either.right) : Maybe.none))
}
