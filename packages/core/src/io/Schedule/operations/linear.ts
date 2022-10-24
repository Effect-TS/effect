import * as Duration from "@fp-ts/data/Duration"

/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops linear
 * @category constructors
 * @since 1.0.0
 */
export function linear(
  base: Duration.Duration
): Schedule<number, never, unknown, Duration.Duration> {
  return Schedule.delayed(
    Schedule.repeatForever.map((i) => Duration.millis(base.millis * (i + 1)))
  )
}
