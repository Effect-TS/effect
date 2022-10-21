import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * Returns a stream that emits `undefined` values spaced by the specified
 * duration.
 *
 * @tsplus static effect/core/stream/Stream.Ops tick
 */
export function tick(interval: Duration): Stream<never, never, void> {
  return Stream.repeatWithSchedule(constVoid, Schedule.spaced(interval))
}
