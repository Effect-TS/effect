/**
 * Semantically blocks the current fiber until the clock time is equal to or
 * greater than the specified duration. Once the clock time is adjusted to
 * on or after the duration, the fiber will automatically be resumed.
 *
 * @tsplus static effect/core/testing/TestClock.Ops sleep
 */
export function sleep(duration: LazyArg<Duration>): Effect<never, never, void> {
  return TestClock.testClockWith((testClock) => testClock.sleep(duration()))
}
