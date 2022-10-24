import type { Duration } from "@fp-ts/data/Duration"
import type { Option } from "@fp-ts/data/Option"

/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUpTo
 * @category mutations
 * @since 1.0.0
 */
export function recurUpTo(duration: Duration): Schedule<Option<number>, never, unknown, Duration> {
  return Schedule.elapsed.whileOutput((elapsed) => elapsed < duration)
}
