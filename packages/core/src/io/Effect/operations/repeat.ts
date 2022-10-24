/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeat
 * @tsplus pipeable effect/core/io/Effect repeat
 * @category repetititon
 * @since 1.0.0
 */
export function repeat<S, R1, A, B>(
  schedule: Schedule<S, R1, A, B>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E, B> =>
    self.repeatOrElse(schedule, (e, _) => Effect.fail(e))
}
