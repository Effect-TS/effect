/**
 * A schedule that recurs once with the specified delay.
 *
 * @tsplus static ets/Schedule/Ops fromDuration
 */
export function fromDuration(
  duration: Duration
): Schedule<boolean, never, unknown, Duration> {
  return Schedule.duration(duration)
}
