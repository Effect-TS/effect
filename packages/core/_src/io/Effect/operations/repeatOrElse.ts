/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus fluent ets/Effect repeatOrElse
 */
export function repeatOrElse_<S, R, E, A, R1, B, R2, E2>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, B>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E2, B> {
  return self.repeatOrElseEither(schedule, orElse).map((either) => either.merge())
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static ets/Effect/Aspects repeatOrElse
 */
export function repeatOrElse<S, R1, A, B, E, R2, E2>(
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, B>,
  __tsplusTrace?: string
): <R>(self: Effect<R, E, A>) => Effect<R & R1 & R2, E2, B> {
  return <R>(self: Effect<R, E, A>): Effect<R & R1 & R2, E2, B> => self.repeatOrElse(schedule, orElse)
}
