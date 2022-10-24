import * as Duration from "@fp-ts/data/Duration"

/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops exponential
 * @category constructors
 * @since 1.0.0
 */
export function exponential(
  base: Duration.Duration,
  factor = 2.0
): Schedule<number, never, unknown, Duration.Duration> {
  return Schedule.delayed(
    Schedule.repeatForever.map((i) => Duration.millis(base.millis * Math.pow(factor, i)))
  )
}
