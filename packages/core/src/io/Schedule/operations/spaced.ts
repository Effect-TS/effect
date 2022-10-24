import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @tsplus static effect/core/io/Schedule.Ops spaced
 * @category constructors
 * @since 1.0.0
 */
export function spaced(duration: Duration): Schedule<number, never, unknown, number> {
  return Schedule.repeatForever.addDelay(() => duration)
}
