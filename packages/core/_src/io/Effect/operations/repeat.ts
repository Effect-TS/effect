/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @tsplus fluent ets/Effect repeat
 */
export function repeat_<S, R, E, A, R1, B>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  __tsplusTrace?: string
): Effect<R | R1, E, B> {
  return self.repeatOrElse(schedule, (e, _) => Effect.fail(e))
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @tsplus static ets/Effect/Aspects repeat
 */
export function repeat<S, R1, A, B>(
  schedule: LazyArg<Schedule<S, R1, A, B>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R | R1, E, B> {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E, B> => self.repeat(schedule)
}
