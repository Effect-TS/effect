/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUpTo
 */
export function recurUpTo(duration: Duration): Schedule<Maybe<number>, never, unknown, Duration> {
  return Schedule.elapsed.whileOutput((elapsed) => elapsed < duration)
}
