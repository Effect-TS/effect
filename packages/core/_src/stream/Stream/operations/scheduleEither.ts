/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite).
 *
 * @tsplus fluent ets/Stream scheduleEither
 */
export function scheduleEither_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, A, B>>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, Either<B, A>>;
export function scheduleEither_<R, E, A, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<R2, A, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, Either<B, A>> {
  return self.scheduleWith(
    schedule,
    (a) => Either.rightW(a),
    (b) => Either.leftW(b)
  );
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite).
 *
 * @tsplus static ets/Stream/Aspects scheduleEither
 */
export const scheduleEither = Pipeable(scheduleEither_);
