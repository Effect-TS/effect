import type { Duration } from "@fp-ts/data/Duration"

/**
 * A schedule that recurs once with the specified delay.
 *
 * @tsplus static effect/core/io/Schedule.Ops fromDuration
 * @category constructors
 * @since 1.0.0
 */
export function fromDuration(
  duration: Duration
): Schedule<boolean, never, unknown, Duration> {
  return Schedule.duration(duration)
}
