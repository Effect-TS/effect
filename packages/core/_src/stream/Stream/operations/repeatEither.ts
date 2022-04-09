/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition.
 *
 * @tsplus fluent ets/Stream repeatEither
 */
export function repeatEither_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, unknown, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, Either<B, A>>;
export function repeatEither_<R, E, A, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<R2, unknown, B>>,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E, Either<B, A>> {
  return self.repeatWith(
    schedule,
    (a) => Either.rightW(a),
    (b) => Either.leftW(b)
  );
}

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition.
 *
 * @tsplus static ets/Stream/Aspects repeatEither
 */
export const repeatEither = Pipeable(repeatEither_);
