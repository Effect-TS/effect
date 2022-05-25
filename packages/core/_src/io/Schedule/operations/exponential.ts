/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 *
 * @tsplus static ets/Schedule/Ops exponential
 */
export function exponential(
  base: Duration,
  factor = 2.0
): Schedule<number, unknown, unknown, Duration> {
  return Schedule.delayed(Schedule.forever.map((i) => new Duration(base.millis * Math.pow(factor, i))))
}
