/**
 * Accesses a `TestClock` instance in the environment and increments the time
 * by the specified duration, running any actions scheduled for on or before
 * the new time in order.
 *
 * @tsplus static effect/core/testing/TestClock.Ops adjust
 */
export function adjust(duration: LazyArg<Duration>): Effect<never, never, void> {
  return TestClock.testClockWith((testClock) => testClock.adjust(duration()))
}
