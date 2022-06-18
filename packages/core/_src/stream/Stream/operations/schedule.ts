/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @tsplus fluent ets/Stream schedule
 */
export function schedule_<R, E, A, S, R2, B>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule<S, R2, A, B>>,
  __tsplusTrace?: string
): Stream<R | R2, E, A> {
  return self
    .scheduleEither(schedule)
    .collect((either) => (either.isRight() ? Maybe.some(either.right) : Maybe.none))
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @tsplus static ets/Stream/Aspects schedule
 */
export const schedule = Pipeable(schedule_)
