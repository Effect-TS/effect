import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops linear
 */
export function linear(
  base: Duration
): Schedule<number, never, unknown, Duration> {
  return Schedule.delayed(
    Schedule.repeatForever.map((i) => new DurationInternal(base.millis * (i + 1)))
  )
}
