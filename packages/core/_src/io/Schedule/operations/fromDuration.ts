/**
 * A schedule that recurs once with the specified delay.
 *
 * @tsplus static ets/Schedule/Ops fromDuration
 */
export function fromDuration(
  duration: Duration
): Schedule.WithState<boolean, unknown, unknown, Duration> {
  return Schedule.duration(duration);
}
