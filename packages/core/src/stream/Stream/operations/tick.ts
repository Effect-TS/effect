import type { Duration } from "@fp-ts/data/Duration"
import { constVoid } from "@fp-ts/data/Function"

/**
 * Returns a stream that emits `undefined` values spaced by the specified
 * duration.
 *
 * @tsplus static effect/core/stream/Stream.Ops tick
 * @category mutations
 * @since 1.0.0
 */
export function tick(interval: Duration): Stream<never, never, void> {
  return Stream.repeatWithSchedule(constVoid, Schedule.spaced(interval))
}
