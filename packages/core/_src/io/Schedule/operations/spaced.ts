/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @tsplus static ets/Schedule/Ops spaced
 */
export function spaced(
  duration: LazyArg<Duration>
): Schedule.WithState<number, unknown, unknown, number> {
  return Schedule.forever.addDelay(duration);
}
