/**
 * Accesses a `TestClock` instance in the environment and sets the clock time
 * to the specified `Instant`, running any actions scheduled for on or before
 * the new time in order.
 *
 * @tsplus static effect/core/testing/TestClock.Ops setTime
 */
export function setTime(instant: number): Effect<never, never, void> {
  return TestClock.testClockWith((testClock) => testClock.setTime(instant))
}
