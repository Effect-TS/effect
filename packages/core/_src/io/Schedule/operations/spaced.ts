/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @tsplus static effect/core/io/Schedule.Ops spaced
 */
export function spaced(
  duration: LazyArg<Duration>
): Schedule<number, never, unknown, number> {
  return Schedule.repeatForever.addDelay(duration)
}
