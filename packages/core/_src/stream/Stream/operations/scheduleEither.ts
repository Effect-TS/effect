/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite).
 *
 * @tsplus static effect/core/stream/Stream.Aspects scheduleEither
 * @tsplus pipeable effect/core/stream/Stream scheduleEither
 */
export function scheduleEither<S, R2, A, B>(
  schedule: LazyArg<Schedule<S, R2, A, B>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, Either<B, A>> =>
    self.scheduleWith(
      schedule,
      (a) => Either.rightW(a),
      (b) => Either.leftW(b)
    )
}
