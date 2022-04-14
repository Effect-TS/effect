/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @tsplus static ets/Schedule/Ops linear
 */
export function linear(
  base: Duration
): Schedule<number, unknown, unknown, Duration> {
  return Schedule.delayed(Schedule.forever.map((i) => new Duration(base.millis * (i + 1))));
}
