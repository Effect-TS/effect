/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static ets/Schedule/Ops upTo
 */
export function recurUpTo(
  duration: Duration
): Schedule<Maybe<number>, never, unknown, Duration> {
  return Schedule.elapsed.whileOutput((_) => _ < duration)
}
